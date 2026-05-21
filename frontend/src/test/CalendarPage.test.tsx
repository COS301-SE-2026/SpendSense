import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import CalendarPage from '@/features/calendar/CalendarPage'

function renderCalendar() {
  return render(
    <MemoryRouter>
      <CalendarPage />
    </MemoryRouter>
  )
}

describe('CalendarPage', () => {
  it('renders the Money Calendar header', () => {
    renderCalendar()
    expect(screen.getByText('Money Calendar')).toBeInTheDocument()
  })

  it('renders the month and year headings', () => {
    renderCalendar()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('DECEMBER')
    expect(heading).toHaveTextContent('2026')
  })

  it('renders month navigation buttons', () => {
    renderCalendar()
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument()
  })

  it('renders the three summary cards', () => {
    renderCalendar()
    expect(screen.getByText(/PAID THIS MONTH/i)).toBeInTheDocument()
    expect(screen.getByText('R 4,200')).toBeInTheDocument()
    expect(screen.getAllByText(/DUE SOON/i).length).toBeGreaterThan(0)
    expect(screen.getByText('R 1,580')).toBeInTheDocument()
    expect(screen.getAllByText(/MISSED/i).length).toBeGreaterThan(0)
    expect(screen.getByText('R 250')).toBeInTheDocument()
  })

  it('renders day-of-week headers', () => {
    renderCalendar()
    ;['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(d =>
      expect(screen.getByText(d)).toBeInTheDocument()
    )
  })

  it('renders today (8) with aria-current="date"', () => {
    renderCalendar()
    const todayBtn = screen.getByRole('button', { name: 'December 8' })
    expect(todayBtn).toHaveAttribute('aria-current', 'date')
  })

  it('renders December 1 through 31', () => {
    renderCalendar()
    for (let d = 1; d <= 31; d++) {
      expect(screen.getByRole('button', { name: `December ${d}` })).toBeInTheDocument()
    }
  })

//no date selected, show all expenses
  it('shows all expenses panel by default (no date selected)', () => {
    renderCalendar()
    expect(screen.getByLabelText(/showing all expenses/i)).toBeInTheDocument()
    expect(screen.getByText(/December 2026/)).toBeInTheDocument()
    expect(screen.getByText(/all expenses/i)).toBeInTheDocument()
  })

  it('shows all monthly events by default', () => {
    renderCalendar()
    expect(screen.getByText('Spotify Premium')).toBeInTheDocument()
    expect(screen.getByText('Internet Service')).toBeInTheDocument()
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('Rent Payment')).toBeInTheDocument()
    expect(screen.getByText('Eskom Utility')).toBeInTheDocument()
  })

  it('shows date labels on event cards in all-expenses view', () => {
    renderCalendar()
    // Each event card shows its date (e.g. "Dec 1", "Dec 15")
    expect(screen.getAllByText(/Dec \d+/).length).toBeGreaterThan(0)
  })


  it('switches to single-date view when a date is clicked', () => {
    renderCalendar()
    fireEvent.click(screen.getByRole('button', { name: 'December 15' }))
    expect(screen.getByText(/Dec 15 — what's/i)).toBeInTheDocument()
  })

  it('shows only that date\'s events after selecting a date', () => {
    renderCalendar()
    fireEvent.click(screen.getByRole('button', { name: 'December 15' }))
    // Dec 15 has Rent and Eskom
    expect(screen.getByText('Rent Payment')).toBeInTheDocument()
    expect(screen.getByText('Eskom Utility')).toBeInTheDocument()
    // Dec 1 event should not appear
    expect(screen.queryByText('Spotify Premium')).not.toBeInTheDocument()
  })

  it('marks the selected date button as pressed', () => {
    renderCalendar()
    fireEvent.click(screen.getByRole('button', { name: 'December 15' }))
    expect(screen.getByRole('button', { name: 'December 15' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a message when a date has no events', () => {
    renderCalendar()
    fireEvent.click(screen.getByRole('button', { name: 'December 10' }))
    expect(screen.getByText(/no expenses on this date/i)).toBeInTheDocument()
  })


  it('returns to all-expenses view when the selected date is clicked again', () => {
    renderCalendar()
    // Select
    fireEvent.click(screen.getByRole('button', { name: 'December 15' }))
    expect(screen.getByText(/Dec 15 — what's/i)).toBeInTheDocument()
    // Deselect by clicking the same date
    fireEvent.click(screen.getByRole('button', { name: 'December 15' }))
    expect(screen.getByLabelText(/showing all expenses/i)).toBeInTheDocument()
    expect(screen.getByText(/all expenses/i)).toBeInTheDocument()
  })

  it('deselected date button returns to unpressed state', () => {
    renderCalendar()
    fireEvent.click(screen.getByRole('button', { name: 'December 1' }))
    expect(screen.getByRole('button', { name: 'December 1' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'December 1' }))
    expect(screen.getByRole('button', { name: 'December 1' })).toHaveAttribute('aria-pressed', 'false')
  })


  it('renders the bottom navigation with Calendar active', () => {
    renderCalendar()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    const calendarLink = screen.getByRole('link', { name: /^calendar$/i })
    expect(calendarLink).toHaveAttribute('aria-current', 'page')
  })

  it('back button links to the home route', () => {
    renderCalendar()
    expect(screen.getByRole('link', { name: /go back/i })).toHaveAttribute('href', '/')
  })
})
