import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import '@testing-library/jest-dom'

import ProfilePage from '../domains/ProfilePage'
import {useUserProfile} from '../hooks/useUserProfile'


//mock hook to make each state controllable
vi.mock('@/hooks/useUserProfile', () => ({
    useUserProfile: vi.fn(),
    initialsFor: (name: string) =>
        name.split(/\s+/).filter(Boolean).slice(0, 2).map((p)=> p[0]?.toUpperCase() ?? '').join('') || 'U',
}))

//stub bottom nav
vi.mock('@/components/common/BottomNav', ()=> ({
    BottomNav: ({active}: {active: string})=> <nav data-testid="bottom-nav" data-active={active}/>

}))

const mockedUseUserProfile= vi.mocked(useUserProfile)

const populatedUser={
    displayName: 'Rachel C',
    email:'rachel@example.com',
    avatarUrl: null,
    memberSince: 'March 2026',
    level: 6,
    tier: 'Good',
    coins: 1250,
    paymentStreak: 28,
    preferences: null,
}

function renderProfile(){
    return render(
        <MemoryRouter>
            <ProfilePage/>
        </MemoryRouter>
    )
}

describe('ProfilePage', ()=> {
    beforeEach(()=> {
        vi.clearAllMocks()
    })

    it('shows the loading state while fetching', ()=>{
        mockedUseUserProfile.mockReturnValue({user: null, loading: true, error: null, refetch: vi.fn()})
        renderProfile()
        expect(screen.getByText(/loading profile/i)).toBeInTheDocument()

    })

    it('shows the error state with a retry that refetches', ()=> {
        const refetch =vi.fn()
        mockedUseUserProfile.mockReturnValue({user: null, loading: false, error:'boom',refetch})
        renderProfile()
        expect(screen.getByText(/couldn't load your profile/i)).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', {name: /try again/i}))
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders real identity, tier, streak and coins when populated', ()=>{
        mockedUseUserProfile.mockReturnValue({user: populatedUser, loading: false, error:null, refetch:vi.fn()})
        renderProfile()

        expect(screen.getByText('Rachel C')).toBeInTheDocument()
        expect(screen.getByText(/level 6 - good/i)).toBeInTheDocument()
        expect(screen.getByText(/28 day streak/i)).toBeInTheDocument()
        expect(screen.getByText(/1,250 coins/i)).toBeInTheDocument()
        expect(screen.getByText(/member since march 2026/i)).toBeInTheDocument()
    })

    it('falls back to the initials when there is no avatar url', ()=> {
        mockedUseUserProfile.mockReturnValue({user: populatedUser, loading: false, error: null, refetch:vi.fn()})
        renderProfile()
        expect(screen.getByText('RC')).toBeInTheDocument()
        expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('renders the avatar image when a url is present', ()=> {
        mockedUseUserProfile.mockReturnValue({
            user:{...populatedUser, avatarUrl: 'https://example.com/a.svg'},
            loading: false,
            error:null,
            refetch: vi.fn(),
        })

        renderProfile()
        expect(screen.getByRole('img', {name: /rachel c's avatar/i})).toHaveAttribute('src', 'https://example.com/a.svg')
    })

    it('links every enabled menu row to its route(wrapped routed to insights)', ()=> {
        renderProfile()
        expect(screen.getByRole('link', {name: /edit profile/i})).toHaveAttribute('href', '/edit-profile')
        expect(screen.getByRole('link', {name: /settings/i})).toHaveAttribute('href', '/settings')
        expect(screen.getByRole('link', {name: /friends & social/i})).toHaveAttribute('href', '/friends')
        expect(screen.getByRole('link', {name: /sticker album/i})).toHaveAttribute('href', '/stickers')
        expect(screen.getByRole('link', {name: /wrapped/i})).toHaveAttribute('href', '/insights')
        expect(screen.getByRole('link', {name: /mascot home/i})).toHaveAttribute('href', '/mascot')
        expect(screen.getByRole('link', {name: /help & support/i})).toHaveAttribute('href', '/help')

    })

    it('marks the profile tab active on nav bar', ()=> {
        mockedUseUserProfile.mockReturnValue({user: populatedUser, loading: false, error: null, refetch: vi.fn()})
        renderProfile()
        expect(screen.getByTestId('bottom-nav')).toHaveAttribute('data-active', 'profile')
    })
})