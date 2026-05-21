import React from 'react'
import {render, screen, fireEvent} from '@testing-library/react'
import {MemoryRouter, Routes, Route} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import StickerDetailPage from '../domains/StickerDetailPage'
import '@testing-library/jest-dom'

const mockNav = vi.fn()
vi.mock('react-router-dom', async()=>{
	const actual = await vi.importActual('react-router-dom')
	return{
		...actual,
		useNavigate: ()=>mockNav,
	}
})

const mockBadge = {
	badgeKey: 'FIRST_OBLIGATION_CREATED',
	name: 'First Obligation',
	description: 'Created your first tracked financial obligation.',
	category: 'CORE_MILESTONES',
	iconKey: 'plus-circle',
	earnedAt: '2026-05-04T15:05:00.000Z',
}

// renders the detail page with router state carrying the badge
function renderWithState(badge = mockBadge){
	return render(
		<MemoryRouter initialEntries={[{pathname: '/stickers/FIRST_OBLIGATION_CREATED', state: {badge}}]}>
			<Routes>
				<Route path="/stickers/:badgeKey" element={<StickerDetailPage/>}/>
			</Routes>
		</MemoryRouter>
	)
}

// renders without state to test the not-found path
function renderWithoutState(){
	return render(
		<MemoryRouter initialEntries={['/stickers/FIRST_OBLIGATION_CREATED']}>
			<Routes>
				<Route path="/stickers/:badgeKey" element={<StickerDetailPage/>}/>
			</Routes>
		</MemoryRouter>
	)
}

describe('StickerDetailPage', ()=>{
	beforeEach(()=>{
		vi.clearAllMocks()
	})


	// NOT FOUND STATE (no router state)

	it('renders not found when accessed without router state', ()=>{
		renderWithoutState()
		expect(screen.getByText(/sticker not found/i)).toBeInTheDocument()
	})

	it('renders back to album button on the not found screen', ()=>{
		renderWithoutState()
		expect(screen.getByRole('button', {name: /back to album/i})).toBeInTheDocument()
	})


	// HEADER

	it('renders quest reward heading', ()=>{
		renderWithState()
		expect(screen.getByText('Quest Reward')).toBeInTheDocument()
	})

	it('renders the go back button', ()=>{
		renderWithState()
		expect(screen.getByRole('button', {name: /go back/i})).toBeInTheDocument()
	})

	it('renders the share icon button', ()=>{
		renderWithState()
		expect(screen.getByRole('button', {name: /share icon/i})).toBeInTheDocument()
	})

	it('calls navigate to /stickers when go back is clicked', ()=>{
		renderWithState()
		fireEvent.click(screen.getByRole('button', {name: /go back/i}))
		expect(mockNav).toHaveBeenCalledWith('/stickers')
	})


	// BADGE CONTENT

	it('renders the badge name from router state', ()=>{
		renderWithState()
		expect(screen.getByText('First Obligation')).toBeInTheDocument()
	})

	it('renders the badge description from router state', ()=>{
		renderWithState()
		expect(screen.getByText(/Created your first tracked financial obligation/i)).toBeInTheDocument()
	})

	it('renders the earned on date pill', ()=>{
		renderWithState()
		expect(screen.getByText(/earned on/i)).toBeInTheDocument()
	})

	it('renders the tier pill', ()=>{
		renderWithState()
		expect(screen.getByText(/tier/i)).toBeInTheDocument()
	})

	it('renders the share the win button', ()=>{
		renderWithState()
		expect(screen.getByText(/share the win/i)).toBeInTheDocument()
	})

	it('renders the back to album button', ()=>{
		renderWithState()
		expect(screen.getByText(/back to album/i)).toBeInTheDocument()
	})

	it('calls navigate to /stickers when back to album is clicked', ()=>{
		renderWithState()
		fireEvent.click(screen.getByText('Back to Album'))
		expect(mockNav).toHaveBeenCalledWith('/stickers')
	})


	// DIFFERENT BADGES

	it('renders a payment category badge correctly', ()=>{
		const paymentBadge = {
			badgeKey: 'FIRST_ON_TIME_PAYMENT',
			name: 'On-Time Starter',
			description: 'Logged your first on-time payment.',
			category: 'PAYMENT',
			iconKey: 'check-circle',
			earnedAt: '2026-05-04T15:05:00.000Z',
		}
		renderWithState(paymentBadge)
		expect(screen.getByText('On-Time Starter')).toBeInTheDocument()
	})

	it('renders the correct tier for a SPECIAL_EVENTS badge', ()=>{
		const specialBadge = {
			badgeKey: 'DEMO_READY',
			name: 'Demo Ready',
			description: 'Seeded profile for a complete Demo 1 walkthrough.',
			category: 'SPECIAL_EVENTS',
			iconKey: 'sparkles',
			earnedAt: '2026-05-04T15:05:00.000Z',
		}
		renderWithState(specialBadge)
		expect(screen.getByText(/legendary tier/i)).toBeInTheDocument()
	})
})
