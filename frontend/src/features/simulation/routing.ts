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

export function pathForSimulationState(
  detail: SimulationDetail,
): string {
  const route = routeForSimulationState(detail)
  const sessionId = detail.session.id

  switch (route) {
    case 'briefing':
      return `/simulations/${sessionId}/briefing`

    case 'board':
    case 'paused':
      return `/simulations/${sessionId}/board`

    case 'payment-result':
      if (detail.session.pending.id) {
        return `/simulations/${sessionId}/obligations/${detail.session.pending.id}`
      }

      return `/simulations/${sessionId}/board`

    case 'event-reveal':
    case 'event-result':
      return `/simulations/${sessionId}/event`

    case 'summary':
      return `/simulations/${sessionId}/summary`

    case 'entry':
      return '/simulations'

    case 'recovery':
    default:
      return '/simulations/recovery'
  }
}