import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {MemoryRouter, Routes, Route} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import CalendarPage from '../domains/CalendarPage'
import { useUserProfile } from "@/hooks/useUserProfile"
import '@testing-library/jest-dom'

vi.mock('../hooks/useCalendarOccurrences', ()=>({
	useCalendarOccurrences: vi.fn(),
}))
vi.mock('../lib/api', ()=>({
	apiFetch: vi.fn(),
}))
vi.mock("@/hooks/useUserProfile", () => ({
    useUserProfile: vi.fn(),
}))

import {useCalendarOccurrences} from '../hooks/useCalendarOccurrences'
import {apiFetch} from '../lib/api'

const mockGoToPreviousMonth = vi.fn()
const mockGoToNextMonth = vi.fn()

const pendingOccurrence ={
	id: 'occ-pending',
	dueDate: '2026-05-25T00:00:00.000Z',
	amountDue: 199,
	currency: 'ZAR',
	status: 'PENDING' as const,
	sequenceNumber: 2,
	daysUntilDue: 4,
	riskLevel: 'LOW' as const,
	obligation: {id: 'obl-1', name: 'Netflix', type: 'SUBSCRIPTION', priority: 'MEDIUM'},
	reminders: [],
}

const overdueOccurrence ={
	id: 'occ-overdue',
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
	id: 'occ-paid',
	dueDate: '2026-05-01T00:00:00.000Z',
	amountDue: 5200,
	currency: 'ZAR',
	status: 'PAID' as const,
	sequenceNumber: 1,
	daysUntilDue: -20,
	riskLevel: 'LOW' as const,
	obligation: {id: 'obl-3', name: 'Hatfield Rent', type: 'RENT', priority: 'CRITICAL'},
	reminders: [],
}

const mockDetailResponse ={
	data:{
		data:{
			occurrence:{
				id: 'occ-pending',
				dueDate: '2026-05-25T00:00:00.000Z',
				amountDue: '199.00', // string: prisma decimal serialisation
				currency: 'ZAR',
				status: 'PENDING',
				sequenceNumber: 2,
				paidAt: null,
				overdueAt: null,
				missedAt: null,
			},
			obligation:{id: 'obl-1', name: 'Netflix', type: 'SUBSCRIPTION', priority: 'MEDIUM'},
			paymentRecord: null,
			scoreRisk:{
				estimatedPenaltyIfMissed: -12,
				estimatedPenaltyIfLate: -5,
				explanation: 'Late or missed payments can reduce your simulated financial health score.',
			},
			reminders: [],
		},
	},
}

function defaultHookState(overrides = {}){
	return{
		occurrences: [pendingOccurrence, overdueOccurrence, paidOccurrence],
		loading: false,
		error: null,
		displayYear: 2026,
		displayMonth: 4,
		goToPreviousMonth: mockGoToPreviousMonth,
		goToNextMonth: mockGoToNextMonth,
		refetch: vi.fn(),
		...overrides,
	}
}

function renderWithPayRoute(){
	return render(
		<MemoryRouter initialEntries={['/calendar']}>
			<Routes>
				<Route path="/calendar" element={<CalendarPage />} />
				<Route path="/paymentForm" element={<div data-testid="payment-form-page">Payment Form</div>} />
			</Routes>
		</MemoryRouter>
	)
}

describe('CalendarPage integration', ()=>{
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useCalendarOccurrences).mockReturnValue(defaultHookState())
		vi.mocked(apiFetch).mockResolvedValue(mockDetailResponse)
		vi.mocked(useUserProfile).mockReturnValue({
			user: {
				displayName: "TestUser",
				email: "testuser@example.com",
				avatarUrl: null,
				memberSince: "September 2026",
				monthlyBudget: 10000,
				level: 1,
				tier: "Building",
				coins: 0,
				paymentStreak: 0,
				preferences: null,
			},
			loading: false,
			error: null,
			refetch: vi.fn(),
		})
	})


	// TAP TO PAY FLOW

	it('navigates to PaymentForm when a PENDING occurrence is tapped', async () => {
		renderWithPayRoute()
		fireEvent.click(screen.getByRole('button', {name: /pay netflix/i }))
		await waitFor(() => {
			expect(screen.getByTestId('payment-form-page')).toBeInTheDocument()
		})
	})

	it('calls GET /payment-occurrences/:id with the correct id on tap', async () => {
		renderWithPayRoute()
		fireEvent.click(screen.getByRole('button', {name: /pay netflix/i }))
		await waitFor(() => {
			expect(vi.mocked(apiFetch)).toHaveBeenCalledWith('/payment-occurrences/occ-pending')
		})
	})

	it('navigates to PaymentForm when an OVERDUE occurrence is tapped', async () => {
		renderWithPayRoute()
		fireEvent.click(screen.getByRole('button', {name: /pay electricity/i }))
		await waitFor(() => {
			expect(screen.getByTestId('payment-form-page')).toBeInTheDocument()
		})
	})

	it('does not navigate when a PAID occurrence card is tapped', async () => {
		renderWithPayRoute()
		const paidBtn = screen.getByRole('button', {name: /hatfield rent, paid/i })
		expect(paidBtn).toBeDisabled()
		expect(screen.queryByTestId('payment-form-page')).not.toBeInTheDocument()
	})

	it('shows a loading spinner on the tapped card while the detail fetch is in progress', async () => {
		vi.mocked(apiFetch).mockReturnValue(new Promise(() => {}))
		renderWithPayRoute()
		fireEvent.click(screen.getByRole('button', {name: /pay netflix/i }))
		await waitFor(() => {
			expect(document.querySelector('.animate-spin')).toBeInTheDocument()
		})
	})

	it('falls back to list data and still navigates if the detail fetch fails', async () => {
		vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))
		renderWithPayRoute()
		fireEvent.click(screen.getByRole('button', {name: /pay netflix/i }))
		await waitFor(() => {
			expect(screen.getByTestId('payment-form-page')).toBeInTheDocument()
		})
	})


	// MONTH NAVIGATION

	it('calls goToPreviousMonth when previous month button is clicked', () => {
		renderWithPayRoute()
		fireEvent.click(screen.getByRole('button', {name: /previous month/i }))
		expect(mockGoToPreviousMonth).toHaveBeenCalledOnce()
	})

	it('calls goToNextMonth when next month button is clicked', () => {
		renderWithPayRoute()
		fireEvent.click(screen.getByRole('button', { name: /next month/i }))
		expect(mockGoToNextMonth).toHaveBeenCalledOnce()
	})


	// DOUBLE WRAP AND DECIMAL NORMALISATION

	it('handles amountDue returned as a string without crashing', async () => {
		renderWithPayRoute()
		fireEvent.click(screen.getByRole('button', {name: /pay netflix/i }))
		await waitFor(()=>{
			expect(screen.getByTestId('payment-form-page')).toBeInTheDocument()
		})
		expect(vi.mocked(apiFetch)).toHaveBeenCalledOnce()
	})


	// ERROR BANNER

	it('renders the error banner when the hook reports a fetch failure', () => {
		vi.mocked(useCalendarOccurrences).mockReturnValue(
			defaultHookState({ error: 'Failed to load calendar data', occurrences: [] })
		)
		renderWithPayRoute()
		expect(screen.getByText('Failed to load calendar data')).toBeInTheDocument()
	})
})
