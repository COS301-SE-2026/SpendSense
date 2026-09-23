import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  beforeEach,
  describe,
  expect,
  vi,
  it,
} from 'vitest'
import SimulationObligationDetailPage from '@/domains/SimulationObligationDetailPage'
import { continueSimulation, paySimulationObligation } from '@/features/simulation/api'
import { activeBoardFixture } from '@/features/simulation/fixtures/SimulationDetail'
import { useSimulation } from '@/hooks/useSimulation'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<
      typeof import('react-router-dom')
    >('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({
      sessionId: 'sim_fixture_active',
      obligationId: 'ob_fixture_2'
    }),
  }
})

vi.mock('@/features/simulation/api', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/simulation/api')
    >('@/features/simulation/api')

  return {
    ...actual,
    paySimulationObligation: vi.fn(),
    continueSimulation: vi.fn(),
  }
})

vi.mock('@/features/simulation/idempotency', async () => ({
  createIdempotencyKey: vi.fn(() => 'test-idempotency-key'),
}))

vi.mock('@/hooks/useSimulation', () => ({
  useSimulation: vi.fn(),
}))

const mockedUseSimulation = vi.mocked(useSimulation)

const mockedPaySimulationObligation = vi.mocked(paySimulationObligation)

const mockedContinueSimulation = vi.mocked(continueSimulation)

function payableSimulation() {
  return {
    ...activeBoardFixture,
    allowedActions: [
      'PAY_OBLIGATION' as const,
    ],

    obligations:
      activeBoardFixture.obligations.map(
        (obligation) =>
          obligation.id === 'ob_fixture_2'
            ? {
              ...obligation,
              status: 'PAYABLE' as const,
            }
          : obligation,
      ),
  }
}

const setSimulation = vi.fn()

const refetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  mockedUseSimulation.mockReturnValue({
    data: payableSimulation(),
    loading: false,
    error: null,
    refetch,
    setSimulation,
  })
})

describe('Simulation obligation payment', () => {
  it('will show the payment result after a successful payment', async () => {
    const user = userEvent.setup()
    const simulation = payableSimulation()

    mockedPaySimulationObligation.mockResolvedValue({
      ...simulation,
      session: {
        ...simulation.session,
        currentBalance: '3500.00',
        savingsBalance: '1750.00',
        pending: {
          type: 'PAYMENT_RESULT',
          id: 'ob_fixture_2',
        },
      },
      obligations:
        simulation.obligations.map(
          (obligation) =>
            obligation.id === 'ob_fixture_2'
              ? {
                  ...obligation,
                  status: 'PAID' as const,
                }
              : obligation,
        ),
      payment: {
        obligationId: 'ob_fixture_2',
        currentUsed: '360.00',
        savingsUsed: '100.00',
        pointsAwarded: '36',
      },
      replayed: false,
    })

    render(
      <SimulationObligationDetailPage/>,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Pay full amount',
      }),
    )

    expect(
      mockedPaySimulationObligation,
    ).toHaveBeenCalledWith(
      'sim_fixture_active',
      'ob_fixture_2',
      'test-idempotency-key',
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Payment recorded',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('R 360,00'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('R 100,00'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('+36'),
    ).toBeInTheDocument()
  })

  it('will show insufficient funds without changing the sim state', async () => {
    const user = userEvent.setup()

    mockedPaySimulationObligation.mockRejectedValue({
      statusCode: 409,
      error: {
        code: 'INSUFFICIENT_SIMULATION_FUNDS',
        message: 'Not enough simulation funds',
        currentBalance: '100.00',
        savingsBalance: '50.00',
        remainingAmount: '310.00',
      },
    })

    render(
      <SimulationObligationDetailPage/>,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Pay full amount',
      }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Not enough simulation funds',
    )
    expect(
      screen.getByText('Payment shortfall'),
    ).toBeInTheDocument()
    expect(setSimulation).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', {
        name: 'Pay full amount',
      }),
    ).toBeInTheDocument()
  })

  it('will prevent duplicate payments', async () => {
    const user = userEvent.setup()

    mockedPaySimulationObligation.mockImplementation(
      () => new Promise(() => {}),
    )

    render(
      <SimulationObligationDetailPage/>,
    )

    const button = screen.getByRole(
      'button',
      {
        name: 'Pay full amount',
      },
    )

    await user.click(button)
    await user.click(button)

    expect(
      mockedPaySimulationObligation,
    ).toHaveBeenCalledTimes(1)
  })

  it('will use the same idempotency key when retrying the payment', async () => {
    const user = userEvent.setup()
    const simulation = payableSimulation()

    mockedPaySimulationObligation
      .mockRejectedValueOnce(
        new Error('network failure'),
      )
      .mockResolvedValueOnce({
        ...simulation,
        session: {
          ...simulation.session,
          pending: {
            type: 'PAYMENT_RESULT',
            id: 'ob_fixture_2',
          },
        },
        payment: {
          obligationId: 'ob_fixture_2',
          currentUsed: '360.00',
          savingsUsed: '100.00',
          pointsAwarded: '36',
        },
        replayed: false,
      })

    render(
      <SimulationObligationDetailPage/>,
    )

    const button = screen.getByRole(
      'button',
      {
        name: 'Pay full amount',
      },
    )

    await user.click(button)

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'The payment could not be confirmed',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Pay full amount',
      }),
    )

    expect(
      mockedPaySimulationObligation,
    ).toHaveBeenNthCalledWith(
      1,
      'sim_fixture_active',
      'ob_fixture_2',
      'test-idempotency-key',
    )
    expect(
      mockedPaySimulationObligation,
    ).toHaveBeenNthCalledWith(
      2,
      'sim_fixture_active',
      'ob_fixture_2',
      'test-idempotency-key',
    )
  })

  it('will render a recovered payment result', () => {
    const simulation = payableSimulation()

    mockedUseSimulation.mockReturnValue({
      data: {
        ...simulation,
        allowedActions: [
          'CONTINUE' as const,
        ],
        session: {
          ...simulation.session,
          pending: {
            type: 'PAYMENT_RESULT',
            id: 'ob_fixture_2',
          },
        },
        obligations:
          simulation.obligations.map(
            (obligation) =>
              obligation.id === 'ob_fixture_2'
                ? {
                    ...obligation,
                    status: 'PAID' as const,
                  }
                : obligation,
          ),
      },
      loading: false,
      error: null,
      refetch,
      setSimulation,
    })

    render(
      <SimulationObligationDetailPage/>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Payment recorded',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Continue',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Current used'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Savings used'),
    ).not.toBeInTheDocument()
  })

  it('will call continue before returning to the normal gameplay', async () => {
    const user = userEvent.setup()
    const simulation = payableSimulation()

    mockedPaySimulationObligation.mockResolvedValue({
      ...simulation,
      session: {
        ...simulation.session,
        pending: {
          type: 'PAYMENT_RESULT',
          id: 'ob_fixture_2',
        },
      },
      payment: {
        obligationId: 'ob_fixture_2',
        currentUsed: '360.00',
        savingsUsed: '100.00',
        pointsAwarded: '36',
      },
      replayed: false,
    })

    mockedContinueSimulation.mockResolvedValue({
      ...simulation,
      session: {
        ...simulation.session,
        pending: {
          type: 'NONE',
          id: null,
        },
      },
      replayed: false,
    })

    render(
      <SimulationObligationDetailPage/>,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Pay full amount',
      }),
    )

    await user.click(
      await screen.findByRole('button', {
        name: 'Return to month',
      }),
    )

    expect(
      mockedContinueSimulation,
    ).toHaveBeenCalledWith(
      'sim_fixture_active',
      'test-idempotency-key',
    )
  })

  it('will refetch state after a stale payment conflict', async () => {
    const user = userEvent.setup()
    const simulation = payableSimulation()

    mockedPaySimulationObligation.mockRejectedValue({
      statusCode: 409,
      error: {
        code: 'SIMULATION_ACTION_PENDING',
        message: 'Simulation state changed',
      },
    })

    refetch.mockResolvedValue({
      ...simulation,
      allowedActions: [],
      obligations:
        simulation.obligations.map(
          (obligation) =>
            obligation.id === 'ob_fixture_2'
              ? {
                  ...obligation,
                  status: 'PAID' as const,
                }
              : obligation,
        ),
    })

    render(
      <SimulationObligationDetailPage/>,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Pay full amount',
      }),
    )

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})