import * as React from 'react'

export function useSimulationCountdown(
  nextDayAt: string | null,
): number | null {
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    if (!nextDayAt) {
      return
    }

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [nextDayAt])

  if (!nextDayAt) {
    return null
  }

  const deadline = new Date(nextDayAt).getTime()

  if (Number.isNaN(deadline)) {
    return null
  }

  return Math.max(0, Math.ceil((deadline - now)/1000))
}