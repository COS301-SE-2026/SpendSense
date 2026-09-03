import React from 'react'
import {render, screen, fireEvent, waitFor, within} from '@testing-library/react'
import {MemoryRouter, Routes, Route} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import '@testing-library/jest-dom'

vi.mock('../hooks/useScheduledPayments', async(importOriginal)=> ({
	...(await importOriginal<typeof import('../hooks/useScheduledPayments')>()),
	useScheduledPayments: vi.fn(),
}))
vi.mock('../features/payments/paymentsApi', ()=> ({
	getOccurrenceDetail: vi.fn(),
}))

import ScheduledPaymentsPage from '../domains/ScheduledPaymentsPage'
import {useScheduledPayments} from '../hooks/useScheduledPayments'
import {getOccurrenceDetail} from '../features/payments/paymentsApi'
import type {CalendarOccurrence} from '../hooks/useCalendarOccurrences'

const mockedHook = vi.mocked(useScheduledPayments)
const mockedDetail = vi.mocked(getOccurrenceDetail)

function occurrence(overrides: Partial<CalendarOccurrence> & {id: string}): CalendarOccurrence{
	return {
		dueDate: '2026-09-05T00:00:00.000Z',
		amountDue: 199,
		currency: 'ZAR',
		status: 'PENDING',
		sequenceNumber: 1,
		daysUntilDue: 4,
		riskLevel: 'LOW',
		obligation: {id: 'obl-1', name: 'Netflix', type: 'SUBSCRIPTION', priority: 'MEDIUM'},
		reminders: [],
		...overrides,
	} as CalendarOccurrence
}

const september = {
	key: '2026-09',
	label: 'September 2026',
	occurrences: [occurrence({id: 'occ-pending'})],
	total: 199,
}

const october = {
	key: '2026-10',
	label: 'October 2026',
	occurrences: [
		occurrence({id: 'occ-paid', dueDate: '2026-10-01T00:00:00.000Z', amountDue: 5200, status: 'PAID', obligation: {id: 'obl-2', name: 'Hatfield Rent', type: 'RENT', priority: 'CRITICAL'}}),
	],
	total: 5200,
}

const july = {
	key: '2026-07',
	label: 'July 2026',
	occurrences: [
		occurrence({id: 'occ-missed', dueDate: '2026-07-03T00:00:00.000Z', amountDue: 320, status: 'MISSED', obligation: {id: 'obl-3', name: 'Gym Membership', type: 'SUBSCRIPTION', priority: 'LOW'}}),
	],
	total: 320,
}

function hookState(overrides = {}){
	return {
		months: [july, september, october],
		loading: false,
		error: null,
		refetch: vi.fn(),
		...overrides,
	}
}

function renderPage(){
	return render(
		<MemoryRouter initialEntries={['/calendar/scheduled']}>
			<Routes>
				<Route path="/calendar/scheduled" element={<ScheduledPaymentsPage />} />
				<Route path="/paymentForm" element={<div>Payment Form</div>} />
			</Routes>
		</MemoryRouter>,
	)
}

describe('ScheduledPaymentsPage', ()=> {
	let scrollTargets: Element[] = []

	beforeEach(()=> {
		vi.clearAllMocks()
		scrollTargets = []
		Element.prototype.scrollIntoView = vi.fn(function(this: Element){
			scrollTargets.push(this)
		})
		window.scrollBy = vi.fn()
		vi.setSystemTime(new Date('2026-09-15T00:00:00.000Z'))
		mockedHook.mockReturnValue(hookState() as never)
	})

	afterEach(()=> {
		vi.useRealTimers()
	})

	it('separates the payments into a section per month', ()=> {
		renderPage()

		const septemberSection = screen.getByRole('region', {name: 'September 2026'})
		const octoberSection = screen.getByRole('region', {name: 'October 2026'})

		expect(within(septemberSection).getByText('Netflix')).toBeInTheDocument()
		expect(within(octoberSection).getByText('Hatfield Rent')).toBeInTheDocument()
		expect(within(septemberSection).queryByText('Hatfield Rent')).not.toBeInTheDocument()
	})

	it('shows a total for each month', ()=> {
		renderPage()

		const octoberSection = screen.getByRole('region', {name: 'October 2026'})
		expect(within(octoberSection).getAllByText(/R.*5.?200/).length).toBeGreaterThan(0)
	})

	it('keeps the months in chronological order as the hook returned them', ()=> {
		renderPage()

		const headings = screen.getAllByRole('heading', {level: 2}).map((h)=> h.textContent)
		expect(headings).toEqual(['July 2026','September 2026This month','October 2026'])
	})

	it('renders a skeleton while loading', ()=> {
		mockedHook.mockReturnValue(hookState({loading: true, months: []}) as never)
		renderPage()

		expect(screen.getByLabelText(/loading scheduled payments/i)).toBeInTheDocument()
	})

	it('explains the empty state instead of showing a blank page', ()=> {
		mockedHook.mockReturnValue(hookState({months: []}) as never)
		renderPage()

		expect(screen.getByText(/nothing scheduled yet/i)).toBeInTheDocument()
	})

	it('surfaces a load error', ()=> {
		mockedHook.mockReturnValue(hookState({error: 'Network down', months: []}) as never)
		renderPage()

		expect(screen.getByText('Network down')).toBeInTheDocument()
	})

	it('lets a payable occurrence through to the payment form', async()=> {
		mockedDetail.mockResolvedValue({
			occurrence: {id: 'occ-pending', dueDate: '2026-09-05T00:00:00.000Z', amountDue: 199, currency: 'ZAR', status: 'PENDING', sequenceNumber: 1, paidAt: null, overdueAt: null, missedAt: null},
			obligation: {id: 'obl-1', name: 'Netflix', type: 'SUBSCRIPTION', priority: 'MEDIUM'},
			paymentRecord: null,
			scoreRisk: {estimatedPenaltyIfMissed: -20, estimatedPenaltyIfLate: -8, explanation: 'test'},
			reminders: [],
		})
		renderPage()

		fireEvent.click(screen.getByRole('button', {name: /pay netflix/i}))

		await waitFor(()=> {
			expect(screen.getByText('Payment Form')).toBeInTheDocument()
		})
		expect(mockedDetail).toHaveBeenCalledWith('occ-pending')
	})

	it('still reaches the payment form when the detail fetch fails', async()=> {
		mockedDetail.mockRejectedValue(new Error('Network error'))
		renderPage()

		fireEvent.click(screen.getByRole('button', {name: /pay netflix/i}))

		await waitFor(()=> {
			expect(screen.getByText('Payment Form')).toBeInTheDocument()
		})
	})

	it('scrolls to the current month on open', ()=> {
		renderPage()

		expect(scrollTargets).toHaveLength(1)
		expect(scrollTargets[0]).toBe(screen.getByTestId('month-2026-09'))
	})

	it('leaves past months above, reachable by scrolling up', ()=> {
		renderPage()

		expect(screen.getByTestId('month-2026-07')).toBeInTheDocument()
		expect(screen.getByText('Gym Membership')).toBeInTheDocument()
	})

	it('keeps the back arrow and title on screen after anchoring', ()=> {
		renderPage()

		expect(screen.getByRole('banner')).toHaveAttribute('data-sticky','true')
		expect(screen.getByRole('button', {name: /back/i})).toBeInTheDocument()
		expect(screen.getByText('Scheduled Payments')).toBeInTheDocument()
	})

	it('offsets the anchored month so the sticky header does not cover it', ()=> {
		renderPage()

		expect(screen.getByTestId('month-2026-09').className).toMatch(/scroll-mt-/)
	})

	it('marks the current month so the user can tell where they are', ()=> {
		renderPage()

		expect(screen.getByTestId('month-2026-09')).toHaveAttribute('data-current','true')
		expect(screen.getByTestId('month-2026-07')).toHaveAttribute('data-current','false')
		expect(screen.getByText(/this month/i)).toBeInTheDocument()
	})

	it('falls back to the next month that has payments when this one is empty', ()=> {
		mockedHook.mockReturnValue(hookState({months: [july, october]}) as never)
		renderPage()

		expect(scrollTargets[0]).toBe(screen.getByTestId('month-2026-10'))
	})

	it('anchors to the current month even when it has no payments', ()=> {
		const emptySeptember = {key: '2026-09', label: 'September 2026', occurrences: [], total: 0}
		mockedHook.mockReturnValue(hookState({months: [july, emptySeptember]}) as never)
		renderPage()

		expect(scrollTargets[0]).toBe(screen.getByTestId('month-2026-09'))
		expect(screen.getByText(/nothing scheduled this month/i)).toBeInTheDocument()
	})

	it('never opens on the oldest month when everything is in the past', ()=> {
		const august = {key: '2026-08', label: 'August 2026', occurrences: [occurrence({id: 'occ-aug'})], total: 199}
		mockedHook.mockReturnValue(hookState({months: [july, august]}) as never)
		renderPage()

		expect(scrollTargets[0]).toBe(screen.getByTestId('month-2026-08'))
		expect(scrollTargets[0]).not.toBe(screen.getByTestId('month-2026-07'))
	})

	it('does not scroll while the months are still loading', ()=> {
		mockedHook.mockReturnValue(hookState({loading: true, months: []}) as never)
		renderPage()

		expect(scrollTargets).toEqual([])
	})

	it('does not offer tap to pay on a settled occurrence', ()=> {
		renderPage()

		const paidRow = screen.getByRole('button', {name: /hatfield rent.*paid/i})
		expect(paidRow).toBeDisabled()
		expect(mockedDetail).not.toHaveBeenCalled()
	})
})