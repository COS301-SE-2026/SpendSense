import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import DashboardPage from '@/features/dashboard/DashboardPage'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  it('renders the user greeting', () => {
    renderDashboard()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Hey')
    expect(heading).toHaveTextContent('Rachel')
  })

  it('renders the credit score', () => {
    renderDashboard()
    expect(screen.getByText('742')).toBeInTheDocument()
    expect(screen.getByText('CREDIT SCORE')).toBeInTheDocument()
  })

  it('renders the streak and level badges', () => {
    renderDashboard()
    expect(screen.getByText('7 day streak')).toBeInTheDocument()
    expect(screen.getByText('Lvl 4')).toBeInTheDocument()
  })

  it('renders the XP progress section', () => {
    renderDashboard()
    expect(screen.getByText('850 / 1,200 XP')).toBeInTheDocument()
    expect(screen.getByText('Next Level: 5')).toBeInTheDocument()
  })

  it('renders the Coming Up section with a bill', () => {
    renderDashboard()
    expect(screen.getByText('Coming Up')).toBeInTheDocument()
    expect(screen.getByText('Internet Service')).toBeInTheDocument()
    expect(screen.getByText('R 54.00')).toBeInTheDocument()
  })

  it('renders the Recent Activity section with a transaction', () => {
    renderDashboard()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('Supermarket Store')).toBeInTheDocument()
    expect(screen.getByText('−R 12.50')).toBeInTheDocument()
  })

  it('renders the Stickers section', () => {
    renderDashboard()
    expect(screen.getByText('Stickers')).toBeInTheDocument()
    expect(screen.getByText('24 collected · 32 to go')).toBeInTheDocument()
  })

  it('renders the bottom navigation', () => {
    renderDashboard()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Quests')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('marks Home as the active nav tab', () => {
    renderDashboard()
    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveAttribute('aria-current', 'page')
  })

  it('renders nav links pointing to correct routes', () => {
    renderDashboard()
    // multiple calendar links exist (button + nav tab), all should point to /calendar
    const calendarLinks = screen.getAllByRole('link', { name: /calendar/i })
    calendarLinks.forEach(link => expect(link).toHaveAttribute('href', '/calendar'))
    expect(screen.getByRole('link', { name: /add expense/i })).toHaveAttribute('href', '/transactions/new')
  })
})
