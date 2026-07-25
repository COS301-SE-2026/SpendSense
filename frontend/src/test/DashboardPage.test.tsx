import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import DashboardPage from '../domains/DashboardPage'
import'@testing-library/jest-dom'
import { signOut } from '../features/auth/auth.service'

vi.mock('@hugeicons/react', () => ({
  HugeiconsIcon: () => null,
}))
vi.mock('@hugeicons/core-free-icons', () => ({
  SparklesIcon: null,
  FireIcon: null,
  SunriseIcon: null,
}))

vi.mock('../features/dashboard/dashboardApi', () => ({
  getDashboard: () => Promise.resolve({
    data: {
      userSummary: { displayName: 'Rachel' },
      creditProfile: { currentScore: 742 },
      gamificationProfile: { xp: 850, mascotLevel: 4, currentPaymentStreak: 7 },
      upcomingPayments: [{
        id: 'payment-1',
        amountDue: 54,
        currency: 'ZAR',
        status: 'PENDING',
        obligation: { name: 'Internet Service' },
      }],
      unreadNotifications: [],
    },
  }),
}))

vi.mock('../features/credit-score/credit-scoreApi', () => ({
  getCrditScore: () => Promise.resolve({
    data: {
      applicableRisk: { applied: false, cap: 850, reason: 'NONE' },
      reasonForRiskCaps: '',
      creditScore: 742,
      creditScoreTier: 'GOOD',
      savingsBuffer: 0.2,
      onTimePaymentCount: 8,
      onLatePaymentCount: 1,
    },
  }),
}))

vi.mock('../features/auth/auth.service', () => ({
  signOut: vi.fn(),
}))

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

async function renderLoadedDashboard() {
  renderDashboard()
  await screen.findByText('742')
}

describe('DashboardPage', () => {
  it('renders the user greeting', async () => {
    await renderLoadedDashboard()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Hey')
    expect(heading).toHaveTextContent('Rachel')
  })

  it('renders the credit score', async () => {
    await renderLoadedDashboard()
    expect(screen.getByText('742')).toBeInTheDocument()
    expect(screen.getByText('CREDIT SCORE')).toBeInTheDocument()
  })

  it('renders the streak and level badges', async () => {
    await renderLoadedDashboard()
    expect(screen.getByText('7 day streak')).toBeInTheDocument()
    expect(screen.getByText('Lvl 4')).toBeInTheDocument()
  })

  it('renders the XP progress section', async () => {
    await renderLoadedDashboard()
    expect(document.body.textContent).toMatch(/850\s*\/\s*1[\s,.]?200\s*XP/i)
    expect(screen.getByText('Next Level: 5')).toBeInTheDocument()
  })

  it('renders the Coming Up section with a bill', async () => {
    await renderLoadedDashboard()
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

  it('enables Quests navigation tabs', async () => {
    await renderLoadedDashboard()
    const questsLink = screen.getByRole('link', { name: /quests/i })
    expect(questsLink).not.toHaveAttribute('aria-disabled', 'true')
    expect(questsLink).not.toHaveClass('pointer-events-none')
    
  })

  it('enables Profile navigation tab', async () =>{
    await renderLoadedDashboard()
    const profileLink = screen.getByRole('link', { name: /profile/i })
    expect(profileLink).not.toHaveAttribute('aria-disabled', 'true')
    expect(profileLink).not.toHaveClass('pointer-events-none')
  })

  it('renders nav links pointing to correct routes', async () => {
    renderDashboard()
    const calendarLinks = screen.getAllByRole('link', { name: /calendar/i })
    calendarLinks.forEach(link => expect(link).toHaveAttribute('href', '/calendar'))
    const triggerButton = screen.getByRole('button', { name: /add transaction options/i })
    expect(triggerButton).toBeInTheDocument()
    fireEvent.click(triggerButton);
    const paymentLink = screen.getByRole('link', { name: /payment/i })
    const obligationLink = screen.getByRole('link', { name: /obligation/i })
    expect(paymentLink).toHaveAttribute('href', '/paymentForm')
    expect(obligationLink).toHaveAttribute('href', '/obligationForm')
  })

  it('signs out and navigates to login', async () => {
    vi.mocked(signOut).mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledOnce()
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })
  })
})
