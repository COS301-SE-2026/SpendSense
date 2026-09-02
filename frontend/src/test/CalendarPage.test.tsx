import React from 'react'
import { render, screen, fireEvent, } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CalendarPage from '../domains/CalendarPage'
import '@testing-library/jest-dom'
 
// mock the hook so unit tests don't make real API calls
vi.mock('../hooks/useCalendarOccurrences', () => ({
	useCalendarOccurrences: vi.fn(),
}))
 
import { useCalendarOccurrences } from '../hooks/useCalendarOccurrences'
 
const mockGoToPreviousMonth = vi.fn()
const mockGoToNextMonth = vi.fn()
 
// minimal occurrence fixture matching CalendarOccurrence shape
const pendingOccurrence = {
	id: 'occ-1',
	dueDate: '2026-05-25T00:00:00.000Z',
	amountDue: 199,
	currency: 'ZAR',
	status: 'PENDING' as const,
	sequenceNumber: 1,
	daysUntilDue: 4,
	riskLevel: 'LOW' as const,
	obligation: { id: 'obl-1', name: 'Netflix', type: 'SUBSCRIPTION', priority: 'MEDIUM'},
	reminders: [],
}
 
const overdueOccurrence ={
	id: 'occ-2',
	dueDate: '2026-05-20T00:00:00.000Z',
	amountDue: 620,
	currency: 'ZAR',
	status: 'OVERDUE' as const,
	sequenceNumber: 2,
	daysUntilDue: -1,
	riskLevel: 'CRITICAL' as const,
	obligation: {id: 'obl-2', name: 'Electricity', type: 'UTILITY', priority: 'HIGH'},
	reminders: [],
}
 
const paidOccurrence ={
	id: 'occ-3',
	dueDate: '2026-05-01T00:00:00.000Z',
	amountDue: 5200,
	currency: 'ZAR',
	status: 'PAID' as const,
	sequenceNumber: 1,
	daysUntilDue: -20,
	riskLevel: 'LOW' as const,
	obligation: { id: 'obl-3', name: 'Hatfield Rent', type: 'RENT', priority: 'CRITICAL' },
	reminders: [],
}
 
const missedOccurrence ={
	id: 'occ-4',
	dueDate: '2026-05-10T00:00:00.000Z',
	amountDue: 430,
	currency: 'ZAR',
	status: 'MISSED' as const,
	sequenceNumber: 3,
	daysUntilDue: -30,
	riskLevel: 'CRITICAL' as const,
	obligation: {id: 'obl-4', name: 'Gym Membership', type: 'SUBSCRIPTION', priority: 'LOW'},
	reminders: [],
}
 
function defaultHookState(overrides = {}){
	return{
		occurrences: [pendingOccurrence, overdueOccurrence, paidOccurrence],
		loading: false,
		error: null,
		displayYear: 2026,
		displayMonth: 4, // for may
		goToPreviousMonth: mockGoToPreviousMonth,
		goToNextMonth: mockGoToNextMonth,
		refetch: vi.fn(),
		...overrides,
	}
}
 
function renderCalendar(){
	return render(
		<MemoryRouter>
			<CalendarPage/>
		</MemoryRouter>
	)
}
 
describe('CalendarPage', ()=>{
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useCalendarOccurrences).mockReturnValue(defaultHookState())
	})
 
	afterEach(()=>{
		vi.restoreAllMocks()
	})
 
 
	// HEADER AND NAVIGATION
 
	it('renders the Money Calendar header', ()=>{
		renderCalendar()
		expect(screen.getByText('Money Calendar')).toBeInTheDocument()
	})
 
	it('renders the current month and year from the hook', ()=>{
		renderCalendar()
		const heading = screen.getByRole('heading', {level: 1})
		expect(heading).toHaveTextContent('MAY')
		expect(heading).toHaveTextContent('2026')
	})
 
	it('renders previous and next month navigation buttons', ()=>{
		renderCalendar()
		expect(screen.getByRole('button', {name: /previous month/i })).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /next month/i })).toBeInTheDocument()
	})
 
	it('calls goToPreviousMonth when previous button is clicked', () => {
		renderCalendar()
		fireEvent.click(screen.getByRole('button', {name: /previous month/i }))
		expect(mockGoToPreviousMonth).toHaveBeenCalledOnce()
	})
 
	it('calls goToNextMonth when next button is clicked', ()=>{
		renderCalendar()
		fireEvent.click(screen.getByRole('button', {name: /next month/i }))
		expect(mockGoToNextMonth).toHaveBeenCalledOnce()
	})
 
 
	// SUMMARY CARDS
 
	it('renders the three summary cards', ()=>{
        renderCalendar()
        expect(screen.getByText(/paid this month/i)).toBeInTheDocument()
        expect(screen.getAllByText(/due soon/i).length).toBeGreaterThan(0)
        expect(screen.getByText(/missed/i)).toBeInTheDocument()
    })
 
	it('calculates paid total from PAID and PAID_LATE occurrences', ()=>{
        renderCalendar()
        expect(screen.getAllByText(/R.*5.?200/).length).toBeGreaterThan(0)
    })
 
    it('calculates due soon total from PENDING occurrences', ()=>{
        renderCalendar()
        expect(screen.getAllByText(/R.*199/).length).toBeGreaterThan(0)
    })
 
    it('calculates overdue total from OVERDUE occurrences', ()=>{
        renderCalendar()
        expect(screen.getAllByText(/R.*620/).length).toBeGreaterThan(0)
    })
 
 
	// LOADING STATE
 
	it('renders skeleton placeholders while loading', ()=>{
		vi.mocked(useCalendarOccurrences).mockReturnValue(defaultHookState({ loading: true, occurrences: [] }))
		renderCalendar()
		const skeletons = document.querySelectorAll('.animate-pulse')
		expect(skeletons.length).toBeGreaterThan(0)
	})
 
	it('does not render occurrence cards while loading', ()=>{
		vi.mocked(useCalendarOccurrences).mockReturnValue(defaultHookState({ loading: true, occurrences: [] }))
		renderCalendar()
		expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
	})
 
 
	// ERROR STATE
 
	it('renders the error banner when the hook returns an error', () => {
		vi.mocked(useCalendarOccurrences).mockReturnValue(
			defaultHookState({error: 'Failed to load calendar data', occurrences: [] })
		)
		renderCalendar()

		expect(screen.getByText('Failed to load calendar data')).toBeInTheDocument()
	})
 
 
	// CALENDAR GRID
 
	it('renders all day-of-week headers', ()=>{
		renderCalendar()
		;['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(d =>
			expect(screen.getByText(d)).toBeInTheDocument()
		)
	})
 
	it('renders all days 1 through 31 for may 2026', ()=>{
		renderCalendar()
		for (let d = 1; d <= 31; d++){
			expect(screen.getByRole('button', { name: `May ${d}` })).toBeInTheDocument()
		}
	})
 
	it('marks today with aria-current="date"', ()=>{
		const now = new Date()
		vi.mocked(useCalendarOccurrences).mockReturnValue(
			defaultHookState({ displayYear: now.getFullYear(), displayMonth: now.getMonth() })
		)
		renderCalendar()
		const currentDates = document.querySelectorAll('[aria-current="date"]')
		expect(currentDates.length).toBe(1)
	})
 
 
	// DEFAULT VIEW (ALL EXPENSES)
 
	it('shows all expenses panel by default', ()=>{
		renderCalendar()
		expect(screen.getByLabelText(/showing all expenses/i)).toBeInTheDocument()
	})
 
	it('shows all occurrences by default sorted by date', ()=>{
		renderCalendar()
		expect(screen.getByText('Netflix')).toBeInTheDocument()
		expect(screen.getByText('Electricity')).toBeInTheDocument()
		expect(screen.getByText('Hatfield Rent')).toBeInTheDocument()
	})
 
	it('shows date labels on cards in all-expenses view', ()=>{
		renderCalendar()
		expect(screen.getAllByText(/may \d+/i).length).toBeGreaterThan(0)
	})
 
 
	// DATE SELECTION
 
	it('switches to single-date view when a date is clicked', ()=>{
		renderCalendar()
		fireEvent.click(screen.getByRole('button', { name: 'May 25' }))
		expect(screen.getByText(/may 25, what's/i)).toBeInTheDocument()
	})
 
	it('shows only occurrences for the selected date', ()=>{
		renderCalendar()
		fireEvent.click(screen.getByRole('button', {name: 'May 25' }))
		// netflix is on the 25th
		expect(screen.getByText('Netflix')).toBeInTheDocument()
		// electricity is on the 20th
		expect(screen.queryByText('Electricity')).not.toBeInTheDocument()
	})
 
	it('marks the selected date button as pressed', ()=>{
		renderCalendar()
		fireEvent.click(screen.getByRole('button', {name: 'May 25' }))
		expect(screen.getByRole('button', {name: 'May 25' })).toHaveAttribute('aria-pressed', 'true')
	})
 
	it('shows no expenses message when selected date has no occurrences', () => {
		renderCalendar()
		fireEvent.click(screen.getByRole('button', {name: 'May 10' }))
		expect(screen.getByText(/no expenses on this date/i)).toBeInTheDocument()
	})
 
	it('deselects the date when clicked again, returning to all-expenses view', () => {
		renderCalendar()
		fireEvent.click(screen.getByRole('button', {name: 'May 25' }))
		fireEvent.click(screen.getByRole('button', {name: 'May 25' }))
		expect(screen.getByLabelText(/showing all expenses/i)).toBeInTheDocument()
	})
 
	it('deselected date button returns to aria-pressed=false', () => {
		renderCalendar()
		fireEvent.click(screen.getByRole('button', {name: 'May 25' }))
		fireEvent.click(screen.getByRole('button', {name: 'May 25' }))
		expect(screen.getByRole('button', { name: 'May 25' })).toHaveAttribute('aria-pressed', 'false')
	})
 

	// OCCURRENCE CADS

	it('renders PENDING status badge as DUE SOON', ()=>{
		renderCalendar()
		// getAllByText because 'DUE SOON' appears in both the summary card label and the occurrence badge
		expect(screen.getAllByText('DUE SOON').length).toBeGreaterThan(0)
	})

	it('renders OVERDUE status badge', ()=>{
		renderCalendar()
		expect(screen.getAllByText('OVERDUE').length).toBeGreaterThan(0)
	})

    it('renders PAID status badge', ()=>{
        renderCalendar()
        expect(screen.getAllByText(/^PAID/).length).toBeGreaterThan(0)
    })
 
	it('shows tap to pay hint on payable occurrences', () => {
		renderCalendar()
		expect(screen.getAllByText(/tap to pay/i).length).toBeGreaterThan(0)
	})
 
	it('does not show tap to pay hint on paid occurrences', ()=>{
		// select the day with only the paid occurrence
		renderCalendar()
		fireEvent.click(screen.getByRole('button', {name: 'May 1'}))
		expect(screen.queryByText(/tap to pay/i)).not.toBeInTheDocument()
	})

	// BOTTOM NAV

	it('renders the bottom navigation', ()=>{
		renderCalendar()
		expect(screen.getByRole('navigation', {name: 'Primary' })).toBeInTheDocument()
	})
 
	it('marks Calendar as the active nav tab', ()=>{
		renderCalendar()
		const calendarLink = screen.getByRole('link', {name: /^calendar$/i })
		expect(calendarLink).toHaveAttribute('aria-current', 'page')
	})

	it('back button links to home', ()=>{
		renderCalendar()
		expect(screen.getByRole('link', {name: /go back/i })).toHaveAttribute('href', '/')
	})
 
	it('menu button opens the full scheduled payments list', ()=>{
		renderCalendar()
		expect(
			screen.getByRole('link', {name: /all scheduled payments/i}),
		).toHaveAttribute('href', '/calendar/scheduled')
	})
 
	it('counts MISSED occurrences in the missed total alongside OVERDUE', ()=>{
		vi.mocked(useCalendarOccurrences).mockReturnValue(
			defaultHookState({occurrences: [overdueOccurrence, missedOccurrence]}) as never
		)
		renderCalendar()
 
		expect(screen.getAllByText(/R.*1.?050/).length).toBeGreaterThan(0)
	})
 
	it('labels a MISSED occurrence as MISSED, not DUE SOON', ()=>{
		vi.mocked(useCalendarOccurrences).mockReturnValue(
			defaultHookState({occurrences: [missedOccurrence]}) as never
		)
		renderCalendar()
 
		const card = screen.getByRole('button', {name: /gym membership/i})
		expect(card).toHaveTextContent('MISSED')
		expect(card).not.toHaveTextContent('DUE SOON')
	})
 
	it('does not offer tap to pay on a MISSED occurrence', ()=>{
		vi.mocked(useCalendarOccurrences).mockReturnValue(
			defaultHookState({occurrences: [missedOccurrence]}) as never
		)
		renderCalendar()
 
		expect(screen.queryByText(/tap to pay/i)).not.toBeInTheDocument()
		expect(screen.getByRole('button', {name: /gym membership, missed/i})).toBeDisabled()
	})
})