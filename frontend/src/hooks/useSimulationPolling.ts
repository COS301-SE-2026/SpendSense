import * as React from 'react'

const POLL_DEFAULT_INTERVAL = 5000

export function useSimulationPolling(
    intervalMs = POLL_DEFAULT_INTERVAL,
    enabled: boolean,
    refetch: () => Promise<unknown> | void,
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
    }, [intervalMs, enabled, refetch])
}