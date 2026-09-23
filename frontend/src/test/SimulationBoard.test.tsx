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
import { activeBoardFixture } from '@/features/simulation/fixtures/SimulationDetail'
import { advanceSimulation } from '@/features/simulation/api'
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
      />,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Transport',
      }),
    ).toBeInTheDocument()

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
        name: 'Pay',
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
        name: 'Pay',
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
      screen.getByRole('heading', {
        name: 'Day 8 of 30',
      }),
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
})