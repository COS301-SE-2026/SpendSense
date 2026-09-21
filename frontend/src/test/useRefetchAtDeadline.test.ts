import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRefetchAtDeadline } from '../features/simulation/hooks/useRefetchAtDeadline';

const initialTime = new Date('2026-09-21T12:00:00.000Z');
const deadline = '2026-09-21T12:00:15.000Z';
const laterDeadline = '2026-09-21T12:01:00.000Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(initialTime);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRefetchAtDeadline', () => {
  it.each([null, 'not-a-date'])('ignores an invalid deadline: %s', (value) => {
    const refetch = vi.fn();

    renderHook(() => useRefetchAtDeadline(value, refetch));

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('refetches at a future deadline', () => {
    const refetch = vi.fn();

    renderHook(() => useRefetchAtDeadline(deadline, refetch));

    act(() => {
      vi.advanceTimersByTime(14_999);
    });
    expect(refetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches immediately for a past deadline', () => {
    const refetch = vi.fn();

    renderHook(() => useRefetchAtDeadline('2026-09-21T11:59:59.000Z', refetch));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('uses a new deadline from the server', () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(
      ({ deadline }) => useRefetchAtDeadline(deadline, refetch),
      {
        initialProps: {
          deadline,
        },
      },
    );

    rerender({ deadline: laterDeadline });

    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(refetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(45_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('uses the latest callback without duplicating the timer', () => {
    const firstRefetch = vi.fn();
    const secondRefetch = vi.fn();
    const { rerender } = renderHook(
      ({ refetch }) => useRefetchAtDeadline(deadline, refetch),
      {
        initialProps: {
          refetch: firstRefetch,
        },
      },
    );

    rerender({ refetch: secondRefetch });

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(firstRefetch).not.toHaveBeenCalled();
    expect(secondRefetch).toHaveBeenCalledTimes(1);
  });

  it('refetches only once for the same deadline', () => {
    const refetch = vi.fn();

    renderHook(() => useRefetchAtDeadline(deadline, refetch));

    act(() => {
      vi.advanceTimersByTime(15_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches when a hidden tab becomes visible after the deadline', () => {
    const refetch = vi.fn();

    renderHook(() => useRefetchAtDeadline(deadline, refetch));

    act(() => {
      vi.setSystemTime(new Date('2026-09-21T12:00:20.000Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('clears the timer on unmount', () => {
    const refetch = vi.fn();
    const { unmount } = renderHook(() =>
      useRefetchAtDeadline(deadline, refetch),
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(refetch).not.toHaveBeenCalled();
  });
});
