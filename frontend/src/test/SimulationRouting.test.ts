import { describe, expect, it } from 'vitest'
import {
  activeBoardFixture,
  eventRevealFixture,
  newObligationFixture,
} from '@/features/simulation/fixtures/SimulationDetail'
import {
  pathForSimulationState,
  routeForSimulationState,
} from '@/features/simulation/routing'

describe('simulation routing', () => {
  it('routes a NEW_OBLIGATION hold to the board popup', () => {
    expect(routeForSimulationState(newObligationFixture)).toBe('new-obligation')
    expect(pathForSimulationState(newObligationFixture)).toBe(
      `/simulation/session/${newObligationFixture.session.id}/board`,
    )
  })

  it('routes an unheld active session to the board', () => {
    expect(routeForSimulationState(activeBoardFixture)).toBe('board')
  })

  it('routes a revealed event to the board popup', () => {
    expect(routeForSimulationState(eventRevealFixture)).toBe('event-reveal')
    expect(pathForSimulationState(eventRevealFixture)).toBe(
      `/simulation/session/${eventRevealFixture.session.id}/board`,
    )
  })
})
