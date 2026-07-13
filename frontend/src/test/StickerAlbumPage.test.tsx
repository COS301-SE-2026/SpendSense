import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import StickerAlbumPage from '../domains/StickerAlbumPage'
import '@testing-library/jest-dom'

vi.mock('../hooks/useGamificationProfile', ()=>({
	useGamificationProfile: vi.fn(),
}))

import {useGamificationProfile} from '../hooks/useGamificationProfile'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async()=>{
	const actual = await vi.importActual('react-router-dom')
	return{
		...actual,
		useNavigate: ()=>mockNavigate,
	}
})

const earnedBadges = [
	{
		badgeKey: 'FIRST_OBLIGATION_CREATED',
		name: 'First Obligation',
		description: 'Created your first tracked financial obligation.',
		category: 'CORE_MILESTONES',
		iconKey: 'plus-circle',
		earnedAt: '2026-05-04T15:05:00.000Z',
	},
	{
		badgeKey: 'FIRST_ON_TIME_PAYMENT',
		name: 'On-Time Starter',
		description: 'Logged your first on-time payment.',
		category: 'PAYMENT',
		iconKey: 'check-circle',
		earnedAt: '2026-05-04T15:05:00.000Z',
	},
]

function defaultProfileState(overrides = {}){
	return{
		profile: {
			coins: 145,
			xp: 320,
			mascotLevel: 2,
			mascotMood: 'HAPPY',
			paymentStreak: 4,
			longestStreak: 6,
			knowledgeStreak: 0,
			longestKnowledgeStreak: 2,
			badges: earnedBadges,
		},
		loading: false,
		error: null,
		refetch: vi.fn(),
		...overrides,
	}
}

function renderAlbum(){
	return render(
		<MemoryRouter>
			<StickerAlbumPage/>
		</MemoryRouter>
	)
}

describe('StickerAlbumPage', ()=>{
	beforeEach(()=>{
		vi.clearAllMocks()
		vi.mocked(useGamificationProfile).mockReturnValue(defaultProfileState())
	})

	afterEach(()=>{
		vi.restoreAllMocks()
	})


	// HEADER

	it('renders the Sticker Album heading', ()=>{
		renderAlbum()
		expect(screen.getByText('Sticker Album')).toBeInTheDocument()
	})

	it('renders the back button', ()=>{
		renderAlbum()
		expect(screen.getByRole('button', {name: /go back/i})).toBeInTheDocument()
	})

	it('renders the search button', ()=>{
		renderAlbum()
		expect(screen.getByRole('button', {name: /search stickers/i})).toBeInTheDocument()
	})

	it('calls navigate("/") when back button is clicked', ()=>{
		renderAlbum()
		fireEvent.click(screen.getByRole('button', {name: /go back/i}))
		expect(mockNavigate).toHaveBeenCalledWith("/")
	})


	// PROGRESS HERO

	it('renders stickers found count from api data', ()=>{
		renderAlbum()
		expect(screen.getByText('Stickers Found')).toBeInTheDocument()
	})

	it('renders the completion percentage bar', ()=>{
		renderAlbum()
		expect(screen.getByText(/completion:/i)).toBeInTheDocument()
	})

	it('shows dashes while loading instead of counts', ()=>{
		vi.mocked(useGamificationProfile).mockReturnValue(defaultProfileState({loading: true, profile: null}))
		renderAlbum()
		// em dashes are split across child elements so check the paragraph textContent directly
		const p = document.querySelector('.text-5xl')
		expect(p?.textContent).toMatch(/—/)
	})


	// LOADING STATE

	it('renders loading skeleton while loading', ()=>{
		vi.mocked(useGamificationProfile).mockReturnValue(defaultProfileState({loading: true, profile: null}))
		renderAlbum()
		const skeletons = document.querySelectorAll('.animate-pulse')
		expect(skeletons.length).toBeGreaterThan(0)
	})

	it('does not render badge names while loading', ()=>{
		vi.mocked(useGamificationProfile).mockReturnValue(defaultProfileState({loading: true, profile: null}))
		renderAlbum()
		expect(screen.queryByText('First Obligation')).not.toBeInTheDocument()
	})


	// ERROR STATE

	it('renders error banner when the hook returns an error', ()=>{
		vi.mocked(useGamificationProfile).mockReturnValue(
			defaultProfileState({error: 'Failed to load gamification profile', profile: null})
		)
		renderAlbum()
		expect(screen.getByText('Failed to load gamification profile')).toBeInTheDocument()
	})


	// EARNED BADGES

	it('renders earned badge names from the api response', ()=>{
		renderAlbum()
		expect(screen.getByText('First Obligation')).toBeInTheDocument()
		expect(screen.getByText('On-Time Starter')).toBeInTheDocument()
	})

	it('earned badge button has correct aria label', ()=>{
		renderAlbum()
		expect(screen.getByRole('button', {name: /first obligation sticker, tap to view/i})).toBeInTheDocument()
	})

	it('earned badge button is not disabled', ()=>{
		renderAlbum()
		const btn = screen.getByRole('button', {name: /first obligation sticker, tap to view/i})
		expect(btn).not.toBeDisabled()
	})


	// LOCKED BADGES

	it('renders locked placeholders for badges not in the api response', ()=>{
		renderAlbum()
		// THREE_PAYMENT_STREAK is in ALL_BADGE_KEYS but not in earnedBadges
		const locked = screen.getAllByText('Locked')
		expect(locked.length).toBeGreaterThan(0)
	})

	it('locked badge button is disabled', ()=>{
		renderAlbum()
		// find a locked badge button and confirm it is disabled
		const lockedBtns = screen.getAllByRole('button', {name: /locked/i})
		lockedBtns.forEach(btn=>expect(btn).toBeDisabled())
	})


	// NAVIGATION TO DETAIL

	it('navigates to the detail page with badge state when an earned badge is tapped', async ()=>{
		renderAlbum()
		fireEvent.click(screen.getByRole('button', {name: /first obligation sticker, tap to view/i}))
		await waitFor(()=>{
			expect(mockNavigate).toHaveBeenCalledWith(
				'/stickers/FIRST_OBLIGATION_CREATED',
				expect.objectContaining({state: expect.objectContaining({badge: expect.objectContaining({badgeKey: 'FIRST_OBLIGATION_CREATED'})})})
			)
		})
	})

	it('does not navigate when a locked badge is clicked', ()=>{
		renderAlbum()
		const lockedBtns = screen.getAllByRole('button', {name: /locked/i})
		fireEvent.click(lockedBtns[0])
		expect(mockNavigate).not.toHaveBeenCalled()
	})


	// CATEGORY SECTIONS

	it('renders the Payment category section', ()=>{
		renderAlbum()
		expect(screen.getByText('Payment')).toBeInTheDocument()
	})

	it('renders the Core Milestones category section', ()=>{
		renderAlbum()
		expect(screen.getByText('Core Milestones')).toBeInTheDocument()
	})
})
