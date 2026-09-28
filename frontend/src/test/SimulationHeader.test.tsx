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
import { SimulationHeader } from '@/components/simulation/SimulationHeader'
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
        name: 'Simulated Month',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Current').parentElement,
    ).toHaveTextContent(/R\s3\s400$/)

    expect(
      screen.getByText('Savings').parentElement,
    ).toHaveTextContent(/R\s1\s800$/)

    expect(
      screen.getByText('points').parentElement,
    ).toHaveTextContent('50')
  })

  it('will show Advance day only when manual advance is allowed', () => {
    const onAdvance = vi.fn()
    const accessibilitySimulation = {
      ...activeBoardFixture,
      session: {
        ...activeBoardFixture.session,
        timedMode: false,
        nextDayAt: null,
      },
    }

    const { rerender } = render(
      <SimulationHeader
        simulation={accessibilitySimulation}
        canAdvance
        onAdvance={onAdvance}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Advance day',
      }),
    ).toBeInTheDocument()

    rerender(
      <SimulationHeader
        simulation={accessibilitySimulation}
        canAdvance={false}
        onAdvance={onAdvance}
      />,
    )

    expect(
      screen.queryByRole('button', {
        name: 'Advance day',
      }),
    ).not.toBeInTheDocument()
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