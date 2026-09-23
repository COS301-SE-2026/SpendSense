import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  beforeEach,
  describe,
  expect,
  vi,
  it,
} from 'vitest'
import { SimulationBoard } from '@/components/simulation/SimulationBoard'
import { activeBoardFixture } from '@/features/simulation/fixtures/SimulationDetail'
import { updateSimulationStatus, getActiveSimulation } from '@/features/simulation/api'
import type { SimulationDetail } from '@/features/simulation/types'

vi.mock('@/hooks/useSimulationPolling', () => ({ useSimulationPolling: vi.fn() }))

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
    updateSimulationStatus: vi.fn(),
    getActiveSimulation: vi.fn(),
  }
})

vi.mock(
  '@/features/simulation/idempotency',
  () => ({
    createIdempotencyKey: vi.fn(
      () => 'test-exit-key',
    ),
  }),
)

const mockedUpdateSimulationStatus =
  vi.mocked(updateSimulationStatus)
const mockedGetActiveSimulation =
  vi.mocked(getActiveSimulation)

const onLeave = vi.fn()
const onDiscarded = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

function pausedSimulation(): SimulationDetail {
  return {
    ...activeBoardFixture,
    session: {
      ...activeBoardFixture.session,
      status: 'PAUSED',
      nextDayAt: null,
    },
  }
}

describe('Simulation exit and discard', () => {
    it('will pause a simulation before saving and then exiting', async () => {
    const user = userEvent.setup()
    const onSimulationChange = vi.fn()

    mockedUpdateSimulationStatus.mockResolvedValue({
      ...pausedSimulation(),
      replayed: false,
    })

    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={onSimulationChange}
        onRefetch={vi.fn()}
        onLeave={onLeave}
        onDiscarded={onDiscarded}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Exit',
      }),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Save and exit',
      }),
    )

    expect(
      mockedUpdateSimulationStatus,
    ).toHaveBeenCalledWith(
      activeBoardFixture.session.id,
      'pause',
      'test-exit-key',
    )

    expect(
      onSimulationChange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          status: 'PAUSED',
        }),
      }),
    )

    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('will open exit confirmation', async () => {
    const user = userEvent.setup()

    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
        onLeave={onLeave}
        onDiscarded={onDiscarded}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Exit',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Leave this month?',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Keep playing',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Save and exit',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Discard run',
      }),
    ).toBeInTheDocument()
  })

    it('will close exit confirmation without changing the state of the simulation', async () => {
    const user = userEvent.setup()

    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
        onLeave={onLeave}
        onDiscarded={onDiscarded}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Exit',
      }),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Keep playing',
      }),
    )

    expect(
      screen.queryByRole('heading', {
        name: 'Leave this month?',
      }),
    ).not.toBeInTheDocument()
    expect(
      mockedUpdateSimulationStatus,
    ).not.toHaveBeenCalled()
  })

  it('will need confirmation before discarding', async () => {
    const user = userEvent.setup()

    mockedUpdateSimulationStatus.mockResolvedValue({
      session: {
        id: activeBoardFixture.session.id,
        status: 'ABANDONED',
        abandonedAt:
          '2026-09-23T10:00:00.000Z',
      },
      replayed: false,
    })

    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
        onLeave={onLeave}
        onDiscarded={onDiscarded}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Exit',
      }),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Discard run',
      }),
    )

    expect(
      mockedUpdateSimulationStatus,
    ).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', {
        name: 'Discard this run?',
      }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Discard run',
      }),
    )
    expect(
      mockedUpdateSimulationStatus,
    ).toHaveBeenCalledWith(
      activeBoardFixture.session.id,
      'discard',
      'test-exit-key',
    )

    await waitFor(() => {
      expect(onDiscarded).toHaveBeenCalledTimes(1)
    })
  })

  it('will refetch the active state when discard is not allowed', async () => {
    const user = userEvent.setup()

    mockedUpdateSimulationStatus.mockRejectedValue({
      statusCode: 409,
      error: {
        code: 'SIMULATION_DISCARD_NOT_ALLOWED',
        message: 'Simulation cannot be discarded',
      },
    })

    mockedGetActiveSimulation.mockResolvedValue({
      active: null,
      latestCompleted: null,
    })

    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
        onLeave={onLeave}
        onDiscarded={onDiscarded}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Exit',
      }),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Discard run',
      }),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Discard run',
      }),
    )

    await waitFor(() => {
      expect(
        mockedGetActiveSimulation,
      ).toHaveBeenCalledTimes(1)
    })

    expect(
      mockedUpdateSimulationStatus,
    ).toHaveBeenCalledWith(
      activeBoardFixture.session.id,
      'discard',
      'test-exit-key',
    )
    expect(
      onDiscarded,
    ).toHaveBeenCalledTimes(1)
  })
})