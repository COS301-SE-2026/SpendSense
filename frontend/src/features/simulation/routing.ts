import type { SimulationDetail } from './types'

export type SimulationRoute = 'briefing' | 'board' | 'payment-result' | 'event-reveal' | 'event-result' | 'paused' | 'summary' | 'recovery' | 'entry'

export function routeForSimulationState(
  detail: SimulationDetail,
): SimulationRoute {
  const { status, pending } = detail.session

  if (status === 'BRIEFING') {
    return 'briefing'
  }

  if (status === 'PAUSED') {
    return 'paused'
  }

  if (status === 'COMPLETED') {
    return 'summary'
  }

  if (status === 'ABANDONED') {
    return 'entry'
  }

  if (status === 'EXPIRED') {
    return 'recovery'
  }

  if (status === 'ACTIVE') {
    switch (pending.type) {
      case 'PAYMENT_RESULT':
        return 'payment-result'

      case 'EVENT_REVEAL':
        return 'event-reveal'

      case 'EVENT_RESULT':
        return 'event-result'

      case 'NONE':
      default:
        return 'board'
    }
  }

  return 'recovery'
}