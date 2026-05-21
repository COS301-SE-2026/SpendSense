import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {MemoryRouter, Routes, Route} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import StickerAlbumPage from '../domains/StickerAlbumPage'
import StickerDetailPage from '../domains/StickerDetailPage'
import '@testing-library/jest-dom'

vi.mock('../hooks/useGamificationProfile', ()=>({
	useGamificationProfile: vi.fn(),
}))

import {useGamificationProfile} from '../hooks/useGamificationProfile'

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

// renders the album with a real detail page route so we can assert full navigation
function renderWithDetailRoute(){
	return render(
		<MemoryRouter initialEntries={['/stickers']}>
			<Routes>
				<Route path="/stickers" element={<StickerAlbumPage/>}/>
				<Route path="/stickers/:badgeKey" element={<StickerDetailPage/>}/>
			</Routes>
		</MemoryRouter>
	)
}

describe('StickerAlbumPage integration', ()=>{
	beforeEach(()=>{
		vi.clearAllMocks()
		vi.mocked(useGamificationProfile).mockReturnValue(defaultProfileState())
	})


	// TAP TO DETAIL FLOW

	it('navigates to detail page and renders badge name when an earned badge is tapped', async ()=>{
		renderWithDetailRoute()
		fireEvent.click(screen.getByRole('button', {name: /first obligation sticker, tap to view/i}))
		await waitFor(()=>{
			expect(screen.getByText('Quest Reward')).toBeInTheDocument()
			expect(screen.getByText('First Obligation')).toBeInTheDocument()
		})
	})

	it('detail page renders the badge description from router state', async ()=>{
		renderWithDetailRoute()
		fireEvent.click(screen.getByRole('button', {name: /first obligation sticker, tap to view/i}))
		await waitFor(()=>{
			expect(screen.getByText(/Created your first tracked financial obligation/i)).toBeInTheDocument()
		})
	})

	it('detail page renders the earned date', async ()=>{
		renderWithDetailRoute()
		fireEvent.click(screen.getByRole('button', {name: /first obligation sticker, tap to view/i}))
		await waitFor(()=>{
			expect(screen.getByText(/earned on/i)).toBeInTheDocument()
		})
	})

	it('detail page renders the tier pill', async ()=>{
		renderWithDetailRoute()
		fireEvent.click(screen.getByRole('button', {name: /first obligation sticker, tap to view/i}))
		await waitFor(()=>{
			expect(screen.getByText(/tier/i)).toBeInTheDocument()
		})
	})

	it('navigating back from detail returns to the album', async ()=>{
		renderWithDetailRoute()
		fireEvent.click(screen.getByRole('button', {name: /first obligation sticker, tap to view/i}))
		await waitFor(()=>expect(screen.getByText('Quest Reward')).toBeInTheDocument())
		fireEvent.click(screen.getByText('Back to Album'))
		await waitFor(()=>{
			expect(screen.getByText('Sticker Album')).toBeInTheDocument()
		})
	})

	it('locked badge does not navigate to the detail page', async ()=>{
		renderWithDetailRoute()
		const lockedBtns = screen.getAllByRole('button', {name: /locked/i})
		fireEvent.click(lockedBtns[0])
		// should still be on the album
		expect(screen.getByText('Sticker Album')).toBeInTheDocument()
		expect(screen.queryByText('Quest Reward')).not.toBeInTheDocument()
	})


	// API DATA DRIVES THE UI

	it('earned count matches the number of badges returned by the api', ()=>{
		renderWithDetailRoute()
		// 2 badges earned out of however many are in ALL_BADGE_KEYS
		expect(screen.getByText(/2\s*\/\s*\d+/)).toBeInTheDocument()
	})

	it('shows the completion percentage based on earned vs total', ()=>{
		renderWithDetailRoute()
		expect(screen.getByText(/completion:/i)).toBeInTheDocument()
	})

	it('shows zero earned when api returns empty badges array', ()=>{
		vi.mocked(useGamificationProfile).mockReturnValue(
			defaultProfileState({profile: {...defaultProfileState().profile, badges: []}})
		)
		renderWithDetailRoute()
		expect(screen.getByText(/0\s*\/\s*\d+/)).toBeInTheDocument()
	})

	it('renders extra earned badges not in the static definition list', ()=>{
		const extraBadge = {
			badgeKey: 'SOME_FUTURE_BADGE',
			name: 'Future Badge',
			description: 'A badge not yet in the static list.',
			category: 'PAYMENT',
			iconKey: 'star',
			earnedAt: '2026-05-20T10:00:00.000Z',
		}
		vi.mocked(useGamificationProfile).mockReturnValue(
			defaultProfileState({profile: {...defaultProfileState().profile, badges: [extraBadge]}})
		)
		renderWithDetailRoute()
		expect(screen.getByText('Future Badge')).toBeInTheDocument()
	})


	// ERROR STATE

	it('renders error banner when hook fails', ()=>{
		vi.mocked(useGamificationProfile).mockReturnValue(
			defaultProfileState({error: 'Failed to load gamification profile', profile: null})
		)
		renderWithDetailRoute()
		expect(screen.getByText('Failed to load gamification profile')).toBeInTheDocument()
	})


	// DETAIL PAGE WITHOUT STATE (direct URL navigation)

	it('detail page shows not found when accessed without router state', async ()=>{
		render(
			<MemoryRouter initialEntries={['/stickers/FIRST_OBLIGATION_CREATED']}>
				<Routes>
					<Route path="/stickers/:badgeKey" element={<StickerDetailPage/>}/>
				</Routes>
			</MemoryRouter>
		)
		expect(screen.getByText(/sticker not found/i)).toBeInTheDocument()
	})
})
