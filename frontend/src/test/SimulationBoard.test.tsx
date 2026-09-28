import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { SimulationBoard } from '@/components/simulation/SimulationBoard'
import { activeBoardFixture, eventRevealFixture, newObligationFixture } from '@/features/simulation/fixtures/SimulationDetail'
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

  it('will position day one at the top before the month starts and highlight it in place', () => {
    const simulation = {
      ...activeBoardFixture,
      session: {
        ...activeBoardFixture.session,
        currentDay: 0,
      },
      obligations: [
        ...activeBoardFixture.obligations,
        {
          ...activeBoardFixture.obligations[1],
          id: 'ob_day_one',
          name: 'Rent',
          dueDay: 1,
        },
      ],
    }
    const boardProps = {
      onSimulationChange: vi.fn(),
      onRefetch: vi.fn(),
    }
    const makeRect = (top: number, height = 40) =>
      ({
        x: 0,
        y: top,
        top,
        right: 320,
        bottom: top + height,
        left: 0,
        width: 320,
        height,
        toJSON: () => ({}),
      }) as DOMRect

    const geometrySpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute('aria-label') === 'Days in the simulated month') {
          return makeRect(100, 320)
        }
        if (this.tagName === 'LI' && this.textContent?.includes('Day 1')) {
          return makeRect(230)
        }
        return makeRect(0)
      })

    const { rerender } = render(
      <SimulationBoard simulation={simulation} {...boardProps} />,
    )

    const agenda = screen.getByLabelText('Days in the simulated month')
    const dayItems = () =>
      Array.from(agenda.querySelectorAll<HTMLElement>(':scope > div > ol > li'))
    const dayOne = () => dayItems()[0]

    expect(dayOne()).toHaveTextContent('Day 1')
    expect(dayOne()).toHaveTextContent('Rent')
    expect(agenda.scrollTop).toBe(114)
    expect(dayOne()).not.toHaveAttribute('aria-current')
    expect(dayOne()?.querySelector('span[aria-hidden="true"]')).toHaveClass(
      'bg-white',
    )
    expect(dayItems().at(-1)).toHaveTextContent('Day 30')
    expect(screen.getByText('Today (0)')).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Recent score' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Upcoming obligations' }),
    ).not.toBeInTheDocument()
    geometrySpy.mockRestore()

    rerender(
      <SimulationBoard
        simulation={{
          ...simulation,
          session: { ...simulation.session, currentDay: 1 },
        }}
        {...boardProps}
      />,
    )

    expect(dayOne()).toHaveTextContent('Day 1')
    expect(dayOne()).toHaveAttribute('aria-current', 'date')
    expect(agenda.scrollTop).toBe(114)
    expect(dayOne()?.querySelector('span[aria-hidden="true"]')).toHaveClass(
      'bg-[#FF6B9D]',
    )
    expect(screen.getByText('Today (1)')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Recent score' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Upcoming obligations' }),
    ).toBeInTheDocument()

    const scrollTo = vi.fn()
    Object.defineProperty(agenda, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })
    rerender(
      <SimulationBoard
        simulation={{
          ...simulation,
          session: { ...simulation.session, currentDay: 2 },
        }}
        {...boardProps}
      />,
    )
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    )
  })

  it('will keep day thirty visible when the final timeline rows are taller than the viewport', () => {
    const makeRect = (top: number, height = 50) =>
      ({
        x: 0,
        y: top,
        top,
        right: 320,
        bottom: top + height,
        left: 0,
        width: 320,
        height,
        toJSON: () => ({}),
      }) as DOMRect
    const previousScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
    const scrollTo = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })
    const geometrySpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute('aria-label') === 'Days in the simulated month') {
          return makeRect(100, 320)
        }
        if (this.tagName === 'LI') {
          const day = Number(this.textContent?.match(/Day (\d+)/)?.[1] ?? 1)
          return makeRect(100 + (day - 1) * 75)
        }
        return makeRect(0)
      })

    try {
      render(
        <SimulationBoard
          simulation={{
            ...activeBoardFixture,
            session: { ...activeBoardFixture.session, currentDay: 30 },
          }}
          onSimulationChange={vi.fn()}
          onRefetch={vi.fn()}
        />,
      )

      expect(screen.getByLabelText('Days in the simulated month'))
        .toHaveAttribute('aria-label', 'Days in the simulated month')
      expect(scrollTo).toHaveBeenCalledWith({ top: 1921, behavior: 'smooth' })
    } finally {
      geometrySpy.mockRestore()
      if (previousScrollTo) {
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', previousScrollTo)
      } else {
        delete (HTMLElement.prototype as HTMLElement & { scrollTo?: unknown }).scrollTo
      }
    }
  })

  it('will smoothly recenter the active day after the agenda has been idle for two seconds', () => {
    vi.useFakeTimers()
    const makeRect = (top: number, height = 40) =>
      ({
        x: 0,
        y: top,
        top,
        right: 320,
        bottom: top + height,
        left: 0,
        width: 320,
        height,
        toJSON: () => ({}),
      }) as DOMRect
    const geometrySpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute('aria-label') === 'Days in the simulated month') {
          return makeRect(100, 320)
        }
        if (this.tagName === 'LI') {
          const day = Number(this.textContent?.match(/Day (\d+)/)?.[1] ?? 1)
          return makeRect(100 + (day - 1) * 80)
        }
        return makeRect(0)
      })

    try {
      render(
        <SimulationBoard
          simulation={activeBoardFixture}
          onSimulationChange={vi.fn()}
          onRefetch={vi.fn()}
        />,
      )
      const agenda = screen.getByLabelText('Days in the simulated month')
      const scrollTo = vi.fn()
      Object.defineProperty(agenda, 'scrollTo', {
        configurable: true,
        value: scrollTo,
      })
      agenda.scrollTop = 1000
      fireEvent.scroll(agenda)

      act(() => vi.advanceTimersByTime(1999))
      expect(scrollTo).not.toHaveBeenCalled()

      act(() => vi.advanceTimersByTime(1))
      expect(scrollTo).toHaveBeenCalledWith({
        top: 1384,
        behavior: 'smooth',
      })
    } finally {
      geometrySpy.mockRestore()
      vi.useRealTimers()
    }
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

  describe('event reveal popup', () => {
    it('will show the revealed event over the board and hand off to the choices', async () => {
      const user = userEvent.setup()
      const onCompareEventChoices = vi.fn()

      render(
        <SimulationBoard
          simulation={eventRevealFixture}
          onSimulationChange={vi.fn()}
          onRefetch={vi.fn()}
          onCompareEventChoices={onCompareEventChoices}
        />,
      )

      const dialog = screen.getByRole('dialog', {
        name: 'Unexpected repair',
      })
      expect(dialog).toHaveTextContent('Surprise event · Day 12')
      expect(dialog).toHaveTextContent(
        eventRevealFixture.currentEvent!.context,
      )

      await user.click(
        screen.getByRole('button', {
          name: 'Compare choices',
        }),
      )
      expect(onCompareEventChoices).toHaveBeenCalledTimes(1)
    })

    it('will not show the event popup while the month is paused', () => {
      render(
        <SimulationBoard
          simulation={{
            ...eventRevealFixture,
            session: {
              ...eventRevealFixture.session,
              status: 'PAUSED',
            },
          }}
          onSimulationChange={vi.fn()}
          onRefetch={vi.fn()}
          onCompareEventChoices={vi.fn()}
        />,
      )

      expect(
        screen.queryByRole('dialog', {
          name: 'Unexpected repair',
        }),
      ).not.toBeInTheDocument()
    })
  })
})
