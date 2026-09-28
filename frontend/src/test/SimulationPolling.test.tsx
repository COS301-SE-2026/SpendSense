import { act, renderHook } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { useSimulationPolling } from '@/hooks/useSimulationPolling'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSimulationPolling', () => {
  it('will refetch at the default polling interval', () => {
    const refetch = vi.fn()

    renderHook(() =>
      useSimulationPolling(true, refetch),
    )

    act(() => {
      vi.advanceTimersByTime(4999)
    })

    expect(refetch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(refetch).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it('will not poll when disabled or in accessibility mode', () => {
    const refetch = vi.fn()

    renderHook(() =>
      useSimulationPolling(false, refetch),
    )

    act(() => {
      vi.advanceTimersByTime(15_000)
    })

    expect(refetch).not.toHaveBeenCalled()
  })

  it('will support custom polling intervals', () => {
    const refetch = vi.fn()

    renderHook(() =>
      useSimulationPolling(true, refetch, 2000),
    )

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(refetch).toHaveBeenCalledTimes(3)
  })

  it('will clear the polling interval', () => {
    const refetch = vi.fn()

    const { unmount } = renderHook(() =>
      useSimulationPolling(true, refetch),
    )

    unmount()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(refetch).not.toHaveBeenCalled()
  })
})