import React from 'react'
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  beforeEach,
  describe,
  expect,
  vi,
  it,
} from 'vitest'
import SimulationRecoveryPage from '@/domains/SimulationRecovery'
import { getActiveSimulation, getSimulation } from '@/features/simulation/api'
import { activeBoardFixture } from '@/features/simulation/fixtures/SimulationDetail'
import type { SimulationDetail } from '@/features/simulation/types'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<
      typeof import('react-router-dom')
    >('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/features/simulation/api', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/simulation/api')
    >('@/features/simulation/api')

  return {
    ...actual,
    getActiveSimulation: vi.fn(),
    getSimulation: vi.fn(),
  }
})

const mockedGetActiveSimulation = vi.mocked(getActiveSimulation)

const mockedGetSimulation = vi.mocked(getSimulation)

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

function expiredSimulation(): SimulationDetail {
  return {
    ...activeBoardFixture,
    session: {
      ...activeBoardFixture.session,
      status: 'EXPIRED',
      nextDayAt: null,
    },
  }
}

describe('Simulation recovery', () => {
  it('will load active session and route to the board', async () => {
    mockedGetActiveSimulation.mockResolvedValue({
      active: activeBoardFixture.session,
      latestCompleted: null,
    })

    mockedGetSimulation.mockResolvedValue(
      activeBoardFixture,
    )

    render(<SimulationRecoveryPage/>)

    expect(
      screen.getByRole('heading', {
        name: 'Restoring your month',
      }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(
        mockedGetActiveSimulation,
      ).toHaveBeenCalledTimes(1)
    })

    expect(
      mockedGetSimulation,
    ).toHaveBeenCalledWith(
      activeBoardFixture.session.id,
    )

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        `/simulations/${activeBoardFixture.session.id}/board`,
        {
          replace: true,
        },
      )
    })
  })

  it('will keep a paused simulation and route it to the board overlay', async () => {
    const paused = pausedSimulation()

    mockedGetActiveSimulation.mockResolvedValue({
      active: paused.session,
      latestCompleted: null,
    })

    mockedGetSimulation.mockResolvedValue(
      paused,
    )

    render(<SimulationRecoveryPage/>)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        `/simulations/${paused.session.id}/board`,
        {
          replace: true,
        },
      )
    })

    expect(
      mockedGetSimulation,
    ).toHaveBeenCalledWith(
      paused.session.id,
    )
  })

  it('will show that there is no saved month when there is no active simulation', async () => {
    mockedGetActiveSimulation.mockResolvedValue({
      active: null,
      latestCompleted: null,
    })

    render(<SimulationRecoveryPage/>)

    expect(
      await screen.findByRole('heading', {
        name: 'No saved month found',
      }),
    ).toBeInTheDocument()
    expect(
      mockedGetSimulation,
    ).not.toHaveBeenCalled()
  })

  it('will show the expired state once the simulation is expired', async () => {
    const expired = expiredSimulation()

    mockedGetActiveSimulation.mockResolvedValue({
      active: activeBoardFixture.session,
      latestCompleted: null,
    })

    mockedGetSimulation.mockResolvedValue(
      expired,
    )

    render(<SimulationRecoveryPage/>)

    expect(
      await screen.findByRole('heading', {
        name: 'This month has expired',
      }),
    ).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('will handle a simulation not found response', async () => {
    mockedGetActiveSimulation.mockResolvedValue({
      active: activeBoardFixture.session,
      latestCompleted: null,
    })

    mockedGetSimulation.mockRejectedValue({
      statusCode: 404,
      error: {
        code: 'SIMULATION_NOT_FOUND',
      },
    })

    render(<SimulationRecoveryPage/>)

    expect(
      await screen.findByRole('heading', {
        name: 'No saved month found',
      }),
    ).toBeInTheDocument()
  })

  it('will allow a retry after a recovery failure', async () => {
    const user = userEvent.setup()

    mockedGetActiveSimulation
      .mockRejectedValueOnce(
        new Error('network failure'),
      )
      .mockResolvedValueOnce({
        active: activeBoardFixture.session,
        latestCompleted: null,
      })

    mockedGetSimulation.mockResolvedValue(
      activeBoardFixture,
    )

    render(<SimulationRecoveryPage/>)

    expect(
      await screen.findByRole('heading', {
        name: 'Could not restore your month',
      }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Retry',
      }),
    )

    await waitFor(() => {
      expect(
        mockedGetActiveSimulation,
      ).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        `/simulations/${activeBoardFixture.session.id}/board`,
        {
          replace: true,
        },
      )
    })
  })
})