import { act, renderHook } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { useSimulationCountdown } from '@/hooks/useSimulationCountdown'

const initialTime = new Date(
  '2026-09-21T12:00:00.000Z',
)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(initialTime)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSimulationCountdown', () => {
  it('will return the remaining seconds until the deadline is reached', () => {
    const { result } = renderHook(() =>
      useSimulationCountdown(
        '2026-09-21T12:00:15.000Z',
      ),
    )

    expect(result.current).toBe(15)
  })

  it('will not advance simulation state', () => {
    const { result } = renderHook(() =>
      useSimulationCountdown(
        '2026-09-21T12:00:02.000Z',
      ),
    )

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current).toBe(0)
  })

  it('will update the displayed countdown every second', () => {
    const { result } = renderHook(() =>
      useSimulationCountdown(
        '2026-09-21T12:00:15.000Z',
      ),
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current).toBe(10)
  })

  it('will stop at zero', () => {
    const { result } = renderHook(() =>
      useSimulationCountdown(
        '2026-09-21T12:00:02.000Z',
      ),
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current).toBe(0)
  })

  it('will return null for invalid deadlines', () => {
    const { result } = renderHook(() =>
      useSimulationCountdown('not-a-date'),
    )

    expect(result.current).toBeNull()
  })

  it('will return null when there is not a deadline', () => {
    const { result } = renderHook(() =>
      useSimulationCountdown(null),
    )

    expect(result.current).toBeNull()
  })
})