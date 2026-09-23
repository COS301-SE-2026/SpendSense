import * as React from 'react'

const POLL_DEFAULT_INTERVAL = 5000

export function useSimulationPolling(
  enabled: boolean,
  refetch: () => Promise<unknown> | void,
  intervalMs = POLL_DEFAULT_INTERVAL,
): void {
  React.useEffect(() => {
    if (!enabled) {
      return
    }

    const interval = window.setInterval(() => {
      void refetch()
    }, intervalMs)

    return () => {
      window.clearInterval(interval)
      }
  }, [enabled, refetch, intervalMs])
}