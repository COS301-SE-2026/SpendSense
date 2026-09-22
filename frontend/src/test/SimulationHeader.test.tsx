import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { SimulationHeader } from '@/features/simulation/components/SimulationHeader'
import { activeBoardFixture } from '@/features/simulation/fixtures/SimulationDetail'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(
    new Date('2026-09-21T12:00:00.000Z'),
  )
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SimulationHeader', () => {
  it('will render authoritative simulation values', () => {
    render(
      <SimulationHeader
        simulation={activeBoardFixture}
      />,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Day 8 of 30',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText('R 6 000,00'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('R 3 400,00'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('R 1 800,00'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('50.00'),
    ).toBeInTheDocument()
  })

  it('will show the timed countdown when in timed mode', () => {
    render(
      <SimulationHeader
        simulation={activeBoardFixture}
      />,
    )

    expect(
      screen.getByLabelText(
        '15 seconds until the next simulated day',
      ),
    ).toBeInTheDocument()
  })

  it('will not show the countdown when in accessibility mode', () => {
    const accessibilitySimulation = {
      ...activeBoardFixture,
      session: {
        ...activeBoardFixture.session,
        timedMode: false,
        nextDayAt: null,
      },
    }

    render(
      <SimulationHeader
        simulation={accessibilitySimulation}
      />,
    )

    expect(
      screen.queryByLabelText(
        /seconds until the next simulated day/i,
      ),
    ).not.toBeInTheDocument()
  })
})