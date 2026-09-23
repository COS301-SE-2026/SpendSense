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
import { SimulationBoard } from '@/components/simulation/SimulationBoard'
import { activeBoardFixture } from '@/features/simulation/fixtures/SimulationDetail'
import { updateSimulationStatus } from '@/features/simulation/api'
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
  }
})

vi.mock(
  '@/features/simulation/idempotency',
  () => ({
    createIdempotencyKey: vi.fn(
      () => 'test-status-key',
    ),
  }),
)

const mockedUpdateSimulationStatus = vi.mocked(updateSimulationStatus)

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

describe('Simulation pause and resume', () => {
  it('will pause using the status and replace the simulation state', async () => {
    const user = userEvent.setup()
    const onSimulationChange = vi.fn()
    const paused = pausedSimulation()

    mockedUpdateSimulationStatus.mockResolvedValue({
      ...paused,
      replayed: false,
    })

    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={onSimulationChange}
        onRefetch={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Pause',
      }),
    )

    expect(
      mockedUpdateSimulationStatus,
    ).toHaveBeenCalledWith(
      activeBoardFixture.session.id,
      'pause',
      'test-status-key',
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
  })

    it('will prevent duplicate pauses', async () => {
    const user = userEvent.setup()

    mockedUpdateSimulationStatus.mockImplementation(
      () => new Promise(() => {}),
    )

    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    const button = screen.getByRole(
      'button',
      {
        name: 'Pause',
      },
    )

    await user.click(button)
    await user.click(button)

    expect(
      mockedUpdateSimulationStatus,
    ).toHaveBeenCalledTimes(1)
  })

    it('will show the pause overlay for a simulation thats paused', () => {
    render(
      <SimulationBoard
        simulation={pausedSimulation()}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Take a break',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Resume month',
      }),
    ).toBeInTheDocument()
  })

    it('will resume using the restored simulation state', async () => {
    const user = userEvent.setup()
    const onSimulationChange = vi.fn()
    const paused = pausedSimulation()
    const resumed: SimulationDetail = {
      ...paused,
      session: {
        ...paused.session,
        status: 'ACTIVE',
        nextDayAt: '2026-09-23T10:15:30.000Z',
      },
    }

    mockedUpdateSimulationStatus.mockResolvedValue({
      ...resumed,
      replayed: false,
    })

    render(
      <SimulationBoard
        simulation={paused}
        onSimulationChange={onSimulationChange}
        onRefetch={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Resume month',
      }),
    )

    expect(
      mockedUpdateSimulationStatus,
    ).toHaveBeenCalledWith(
      paused.session.id,
      'resume',
      'test-status-key',
    )
    expect(
      onSimulationChange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          status: 'ACTIVE',
          nextDayAt:
            '2026-09-23T10:15:30.000Z',
        }),
      }),
    )
  })

    it('will reuse the same idempotency key when trying pause again', async () => {
    const user = userEvent.setup()

    const paused = pausedSimulation()

    mockedUpdateSimulationStatus
      .mockRejectedValueOnce(
        new Error('network failure'),
      )
      .mockResolvedValueOnce({
        ...paused,
        replayed: false,
      })

    render(
      <SimulationBoard
        simulation={activeBoardFixture}
        onSimulationChange={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Pause',
      }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'The simulation could not be paused',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Pause',
      }),
    )

    expect(
      mockedUpdateSimulationStatus,
    ).toHaveBeenNthCalledWith(
      1,
      activeBoardFixture.session.id,
      'pause',
      'test-status-key',
    )
    expect(
      mockedUpdateSimulationStatus,
    ).toHaveBeenNthCalledWith(
      2,
      activeBoardFixture.session.id,
      'pause',
      'test-status-key',
    )
  })
})