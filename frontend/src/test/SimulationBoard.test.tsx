import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { SimulationBoard } from '@/components/simulation/SimulationBoard'
import { activeBoardFixture, newObligationFixture } from '@/features/simulation/fixtures/SimulationDetail'
import { advanceSimulation, continueSimulation } from '@/features/simulation/api'
import type { SimulationActionResponse } from '@/features/simulation/types'

vi.mock('@/hooks/useSimulationPolling', () => ({
  useSimulationPolling: vi.fn(),
}))

vi.mock(
  '@/features/simulation/hooks/useRefetchAtDeadline',
  () => ({
    useRefetchAtDeadline: vi.fn(),
  }),
)

vi.mock('@/features/simulation/api', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/simulation/api')
    >('@/features/simulation/api')

  return {
    ...actual,
    advanceSimulation: vi.fn(),
    continueSimulation: vi.fn(),
  }
})

vi.mock(
  '@/features/simulation/idempotency',
  () => ({
    createIdempotencyKey: vi.fn(
      () => 'test-idempotency-key',
    ),
  }),
)

const mockedAdvanceSimulation =
  vi.mocked(advanceSimulation)

const mockedContinueSimulation =
  vi.mocked(continueSimulation)

function accessibilityFixture() {
  return {
    ...activeBoardFixture,
    session: {
      ...activeBoardFixture.session,
      timedMode: false,
      nextDayAt: null,
    },
    allowedActions: [
      'ADVANCE_DAY' as const,
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SimulationBoard', () => {
  it('will render obligations and score activity', () => {
    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
        onLeave={vi.fn()}
        onDiscarded={vi.fn()}
      />,
    )

    expect(
      screen.getByLabelText('Days in the simulated month'),
    ).toHaveTextContent('Transport')

    expect(
      screen.getByRole('heading', {
        name: 'Utilities',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'On-time obligation payment',
      ),
    ).toBeInTheDocument()
  })

  it('will only expose payment actions when the server allows', () => {
    const simulation = accessibilityFixture()

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Pay Utilities',
      }),
    ).toBeInTheDocument()
  })

  it('will not expose payment when PAY_OBLIGATION isnt allowed', () => {
    const simulation = {
      ...accessibilityFixture(),
      allowedActions: [
        'ADVANCE_DAY' as const,
      ],
    }

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', {
        name: /^Pay /,
      }),
    ).not.toBeInTheDocument()
  })

  it('will not show manual advance in timed mode', () => {
    const simulation = {
      ...activeBoardFixture,
      allowedActions: [
        'ADVANCE_DAY' as const,
      ],
    }

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', {
        name: 'Advance day',
      }),
    ).not.toBeInTheDocument()
  })

  it('will show manual advance in accessibility mode when it is allowed', () => {
    render(
      <SimulationBoard
        simulation={accessibilityFixture()}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Advance day',
      }),
    ).toBeInTheDocument()
  })

  it('will replace state with the advance response', async () => {
    const user = userEvent.setup()
    const simulation = accessibilityFixture()

    const returnedSimulation = {
      ...simulation,
      session: {
        ...simulation.session,
        currentDay: 9,
      },
    }

    mockedAdvanceSimulation.mockResolvedValue({
      ...returnedSimulation,
      replayed: false,
    })

    const onSimulationChange = vi.fn()

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={onSimulationChange}
        onRefetch={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Advance day',
      }),
    )

    expect(
      mockedAdvanceSimulation,
    ).toHaveBeenCalledWith(
      simulation.session.id,
      'test-idempotency-key',
    )

    expect(
      onSimulationChange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          currentDay: 9,
        }),
      }),
    )
  })

  it('will not optimistically change the displayed day', async () => {
    const user = userEvent.setup()
    const simulation = accessibilityFixture()

    let resolveAdvance: ((value: SimulationActionResponse) => void) | undefined

    mockedAdvanceSimulation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAdvance = resolve
        }),
    )

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Advance day',
      }),
    )

    expect(
      screen.getByText('Day 08 of 30'),
    ).toBeInTheDocument()

    resolveAdvance?.({
      ...simulation,
      replayed: false,
    })
  })

  it('will prevent duplicate advance submissions', async () => {
    const user = userEvent.setup()
    const simulation = accessibilityFixture()

    mockedAdvanceSimulation.mockImplementation(
      () => new Promise(() => {}),
    )

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    const button = screen.getByRole(
      'button',
      {
        name: 'Advance day',
      },
    )

    await user.click(button)
    await user.click(button)

    expect(
      mockedAdvanceSimulation,
    ).toHaveBeenCalledTimes(1)
  })

  it('will keep the same idempotency key when retrying a failed advance', async () => {
    const user = userEvent.setup()
    const simulation = accessibilityFixture()

    mockedAdvanceSimulation
      .mockRejectedValueOnce(
        new Error('network failure'),
      )
      .mockResolvedValueOnce({
        ...simulation,
        replayed: false,
      })

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Advance day',
      }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'The day could not be advanced',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Advance day',
      }),
    )

    expect(
      mockedAdvanceSimulation,
    ).toHaveBeenNthCalledWith(
      1,
      simulation.session.id,
      'test-idempotency-key',
    )

    expect(
      mockedAdvanceSimulation,
    ).toHaveBeenNthCalledWith(
      2,
      simulation.session.id,
      'test-idempotency-key',
    )
  })
  it('will allow an upcoming obligation to be paid early', () => {
    const simulation = {
      ...accessibilityFixture(),
      obligations: activeBoardFixture.obligations,
    }

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Pay Utilities',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Due day 14')).toBeInTheDocument()
  })

  it('will not list paid or past-due obligations as payable', () => {
    const simulation = {
      ...accessibilityFixture(),
      session: {
        ...accessibilityFixture().session,
        currentDay: 15,
      },
    }

    render(
      <SimulationBoard
        simulation={simulation}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', {
        name: /^Pay /,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('No obligations remain this month.'),
    ).toBeInTheDocument()
  })

  it('will mark the current day in the agenda', () => {
    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    const days = screen.getByLabelText('Days in the simulated month')
    const current = days.querySelector('[aria-current="date"]')

    expect(current).toHaveTextContent('Day 8')
    expect(days.querySelectorAll(':scope > div > ol > li')).toHaveLength(30)
  })

  it('will open the selected obligation when Pay is clicked',async()=>{
    const user=userEvent.setup()
    const onOpenObligation=vi.fn()
    render(
      <SimulationBoard
        simulation={accessibilityFixture()}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
        onLeave={vi.fn()}
        onDiscarded={vi.fn()}
        onOpenObligation={onOpenObligation}
      />,
    )
    await user.click(
      screen.getByRole('button',{name:'Pay Utilities'}),
    )
    expect(onOpenObligation).toHaveBeenCalledWith('ob_fixture_2')
    expect(onOpenObligation).toHaveBeenCalledTimes(1)
  })

  describe('new obligation popup', () => {
    it('will show the introduced bill while the server holds for acknowledgement', () => {
      render(
        <SimulationBoard
          simulation={newObligationFixture}
          onSimulationChange={vi.fn()}
          onRefetch={vi.fn()}
        />,
      )

      const dialog = screen.getByRole('dialog', {
        name: 'A new bill has arrived',
      })
      expect(dialog).toHaveTextContent('Device licence renewal')
      expect(dialog).toHaveTextContent('Due day 27')
      expect(dialog).toHaveTextContent('Low priority')
      expect(dialog).toHaveTextContent(/R\s360/)
    })

    it('will acknowledge through continue and replace the simulation state', async () => {
      const user = userEvent.setup()
      const onSimulationChange = vi.fn()
      const acknowledged = {
        ...newObligationFixture,
        session: {
          ...newObligationFixture.session,
          pending: { type: 'NONE' as const, id: null },
        },
        newObligation: null,
        allowedActions: ['PAY_OBLIGATION' as const],
        replayed: false,
      }
      mockedContinueSimulation.mockResolvedValue(acknowledged)

      render(
        <SimulationBoard
          simulation={newObligationFixture}
          onSimulationChange={onSimulationChange}
          onRefetch={vi.fn()}
        />,
      )

      await user.click(
        screen.getByRole('button', {
          name: 'Acknowledge and continue',
        }),
      )

      expect(mockedContinueSimulation).toHaveBeenCalledWith(
        newObligationFixture.session.id,
        'test-idempotency-key',
      )
      expect(onSimulationChange).toHaveBeenCalledWith(acknowledged)
    })

    it('will keep the same idempotency key when retrying a failed acknowledgement', async () => {
      const user = userEvent.setup()
      mockedContinueSimulation
        .mockRejectedValueOnce(new Error('network failure'))
        .mockResolvedValueOnce({
          ...newObligationFixture,
          replayed: false,
        })

      render(
        <SimulationBoard
          simulation={newObligationFixture}
          onSimulationChange={vi.fn()}
          onRefetch={vi.fn()}
        />,
      )

      const button = screen.getByRole('button', {
        name: 'Acknowledge and continue',
      })
      await user.click(button)
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'could not be acknowledged',
      )
      await user.click(button)

      expect(mockedContinueSimulation).toHaveBeenCalledTimes(2)
      expect(mockedContinueSimulation).toHaveBeenNthCalledWith(
        2,
        newObligationFixture.session.id,
        'test-idempotency-key',
      )
    })

    it('will not show the popup while the month is paused', () => {
      render(
        <SimulationBoard
          simulation={{
            ...newObligationFixture,
            session: {
              ...newObligationFixture.session,
              status: 'PAUSED',
            },
            allowedActions: [],
          }}
          onSimulationChange={vi.fn()}
          onRefetch={vi.fn()}
        />,
      )

      expect(
        screen.queryByRole('dialog', {
          name: 'A new bill has arrived',
        }),
      ).not.toBeInTheDocument()
    })
  })
})
