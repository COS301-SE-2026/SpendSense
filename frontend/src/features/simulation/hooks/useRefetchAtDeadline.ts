import { useEffect, useRef } from 'react';

type Refetch = () => Promise<unknown> | void;

export function useRefetchAtDeadline(
  isoTimestamp: string | null,
  refetch: Refetch,
): void {
  const refetchRef = useRef(refetch);
  const triggeredDeadlineRef = useRef<number | null>(null);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    const deadline =
      isoTimestamp === null ? Number.NaN : Date.parse(isoTimestamp);

    if (!Number.isFinite(deadline)) {
      triggeredDeadlineRef.current = null;
      return;
    }

    let timeoutId: number | undefined;

    const triggerRefetch = () => {
      if (triggeredDeadlineRef.current === deadline) {
        return;
      }

      if (Date.now() < deadline) {
        scheduleRefetch();
        return;
      }

      triggeredDeadlineRef.current = deadline;
      void refetchRef.current();
    };

    const scheduleRefetch = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      const delay = Math.max(0, deadline - Date.now());
      timeoutId = window.setTimeout(triggerRefetch, delay);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() >= deadline) {
        triggerRefetch();
      }
    };

    triggeredDeadlineRef.current = null;

    if (Date.now() >= deadline) {
      triggerRefetch();
    } else {
      scheduleRefetch();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isoTimestamp]);
}
