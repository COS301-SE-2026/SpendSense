import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach,describe, it, expect, vi } from 'vitest'
import DashboardPage from '../domains/DashboardPage'
import'@testing-library/jest-dom'
import {NotificationsProvider} from '../features/notifications/NotificationsContext'
import {getNotifications} from '../features/notifications/notificationsApi'

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
      gamificationProfile: {
        xp: 850,
        mascotLevel: 4,
        currentPaymentStreak: 7,
        currentKnowledgeStreak: 4,
      },
      stickerStats: {
        collected: 2,
        total: 7,
      },
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

vi.mock('../features/notifications/notificationsApi',()=>({
    getNotifications:vi.fn(),
    markAsRead:vi.fn(),
}))

function renderDashboard() {
  return render(
    <MemoryRouter>
      <NotificationsProvider>
        <DashboardPage />
      </NotificationsProvider>
    </MemoryRouter>
  )
}

async function renderLoadedDashboard() {
  renderDashboard()
  await screen.findByText('742')
}

describe('DashboardPage', () => {
  beforeEach(()=>{
    vi.clearAllMocks()
    vi.mocked(getNotifications).mockResolvedValue({
      data:{
        notifications:[],
        pagination:{
          page:1,
          perPage:1,
          total:3,
          totalPages:3,
        },
      },
    })
  })
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

  it('renders the knowledge streak and level badge', async () => {
    await renderLoadedDashboard()

    // scoped to the panel: the carousel also has an sr-only live region
    // naming the active streak
    expect(
      within(screen.getByTestId('streak-panel-knowledge')).getByText(/knowledge streak/i),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('img', {
        name: '4-days',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('group', {
        name: '4 day knowledge streak',
      }),
    ).toBeInTheDocument()

    expect(screen.getByText('Lvl 4')).toBeInTheDocument()
  })

  it('starts on the knowledge streak and pages to the payment streak', async () => {
    await renderLoadedDashboard()

    const knowledge = screen.getByTestId('streak-panel-knowledge')
    const payment = screen.getByTestId('streak-panel-payment')

    expect(knowledge).toHaveAttribute('aria-hidden', 'false')
    expect(payment).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(screen.getByRole('button', {name: /show next streak/i}))

    expect(knowledge).toHaveAttribute('aria-hidden', 'true')
    expect(payment).toHaveAttribute('aria-hidden', 'false')
    expect(within(payment).getByText(/on-time payments/i)).toBeInTheDocument()
  })

  it('shows the payment streak value from the dashboard payload', async () => {
    await renderLoadedDashboard()

    fireEvent.click(screen.getByRole('button', {name: /show next streak/i}))

    expect(screen.getByRole('img', {name: '7-days'})).toBeInTheDocument()
  })

  it('wraps around so the user can page back the way they came', async () => {
    await renderLoadedDashboard()

    fireEvent.click(screen.getByRole('button', {name: /show previous streak/i}))

    expect(screen.getByTestId('streak-panel-payment')).toHaveAttribute('aria-hidden', 'false')
  })

  it('lets the user jump straight to a streak with the dots', async () => {
    await renderLoadedDashboard()

    fireEvent.click(screen.getByRole('button', {name: /show on-time payments/i}))

    expect(screen.getByTestId('streak-panel-payment')).toHaveAttribute('aria-hidden', 'false')
  })

  it('pages on a horizontal swipe', async () => {
    await renderLoadedDashboard()
    const viewport = screen.getByTestId('streak-carousel-viewport')

    fireEvent.touchStart(viewport, {touches: [{clientX: 200}]})
    fireEvent.touchEnd(viewport, {changedTouches: [{clientX: 100}]})

    expect(screen.getByTestId('streak-panel-payment')).toHaveAttribute('aria-hidden', 'false')
  })

  it('ignores a swipe too small to be intentional', async () => {
    await renderLoadedDashboard()
    const viewport = screen.getByTestId('streak-carousel-viewport')

    fireEvent.touchStart(viewport, {touches: [{clientX: 200}]})
    fireEvent.touchEnd(viewport, {changedTouches: [{clientX: 185}]})

    expect(screen.getByTestId('streak-panel-knowledge')).toHaveAttribute('aria-hidden', 'false')
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


  it('renders the bottom navigation', () => {
    renderDashboard()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Friends')).toBeInTheDocument()
    expect(screen.getByText('Mascot')).toBeInTheDocument()
  })

  it('marks Home as the active nav tab', () => {
    renderDashboard()
    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveAttribute('aria-current', 'page')
  })


  it('enables Mascot navigation tab', async () =>{
    await renderLoadedDashboard()
    const mascotLink = screen.getByRole('link', { name: /mascot/i })
    expect(mascotLink).not.toHaveAttribute('aria-disabled', 'true')
    expect(mascotLink).not.toHaveClass('pointer-events-none')
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

  it('opens the profile from the dashboard header', async () => {
    render(
    <MemoryRouter initialEntries={['/']}>
      <NotificationsProvider>
        <Routes>
          <Route path="/" element={<DashboardPage/>}/>
          <Route path="/profile" element={<div>Profile page</div>}/>
        </Routes>
      </NotificationsProvider>
    </MemoryRouter>,
)

    fireEvent.click(screen.getByRole('button', { name: /profile/i }))

    expect(await screen.findByText('Profile page')).toBeInTheDocument()
  })
})