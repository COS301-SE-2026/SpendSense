import type { SimulationDetail } from './types'

export type SimulationRoute = 'briefing' | 'board' | 'new-obligation' | 'payment-result' | 'event-reveal' | 'event-result' | 'paused' | 'summary' | 'recovery' | 'entry'

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
      case 'NEW_OBLIGATION':
        return 'new-obligation'

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
      return `/simulation/setup/${sessionId}`

    // The new-obligation popup is shown over the board.
    case 'board':
    case 'new-obligation':
    case 'paused':
      return `/simulation/session/${sessionId}/board`

    case 'payment-result':
      if (detail.session.pending.id) {
        return `/simulation/session/${sessionId}/obligations/${detail.session.pending.id}`
      }

      return `/simulation/session/${sessionId}/board`

    case 'event-reveal':
      return `/simulation/session/${sessionId}/event`

    case 'event-result':
      return `/simulation/session/${sessionId}/event-result`

    case 'summary':
      return `/simulation/session/${sessionId}/summary`

    case 'entry':
      return '/simulation'

    case 'recovery':
    default:
      return '/simulation/recovery'
  }
}