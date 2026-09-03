import React from 'react'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import '@testing-library/jest-dom'

import SettingsPreferencesPage from '../domains/SettingsPreferencesPage'
import {updatePreferences} from '../features/profile/profileApi'

const mockedProfile={
    user:{
        displayName: 'Rachel C',
        email: 'rachel@example.com',
        avatarUrl: null,
        memberSince: 'March 2026',
        level: 6,
        tier: 'Good',
        coins: 1250,
        paymentStreak: 28,
        preferences: {theme: 'SYSTEM', currency: 'ZAR', language: 'en', reducedMotion: false},

    },
    loading: false,
    error: null,
    refetch: vi.fn(),

}

vi.mock('@/hooks/useUserProfile', ()=> ({
    useUserProfile: ()=> mockedProfile,
}))

vi.mock('@/features/profile/profileApi', ()=> ({
    updatePreferences: vi.fn(),
}))

const mockedUpdatePreferences= vi.mocked(updatePreferences)

function renderPage(){
    return render(
        <MemoryRouter>
            <SettingsPreferencesPage/>
        </MemoryRouter>
    )
}

describe('SettingsPreferencesPage', ()=> {
    beforeEach(()=> {
        vi.clearAllMocks()
        localStorage.clear()
        document.documentElement.classList.remove('reduce-motion')
    })


    it('offers exactly the Theme enum values and nothing else', ()=> {
        renderPage()
        expect(screen.getByRole('button', {name: 'System'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Light'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Dark'})).toBeInTheDocument()
        expect(screen.queryByRole('button', {name: /auto/i})).not.toBeInTheDocument()
    })

    it('marks the loaded preferences values as selected', ()=> {
        renderPage()
        expect(screen.getByRole('button', {name: 'System'})).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', {name: 'Dark'})).toHaveAttribute('aria-pressed', 'false')
        expect(screen.getByRole('switch', {name: /reduced motion/i})).toHaveAttribute('aria-checked', 'false')
    })

    it('toggles reduced motion via an accessible switch', ()=> {
        renderPage()
        const toggle=screen.getByRole('switch', {name: /reduced motion/i})
        fireEvent.click(toggle)
        expect(toggle).toHaveAttribute('aria-checked', 'true')
    })


    it('saves the selected values through updatePreferences', async ()=>{
        mockedUpdatePreferences.mockResolvedValue({data: {}})
        renderPage()
        fireEvent.click(screen.getByRole('button', {name: 'Dark'}))
        fireEvent.click(screen.getByRole('switch', {name: /reduced motion/i}))
        fireEvent.click(screen.getByRole('button', {name: /save preferences/i}))

        await waitFor(()=> {
            expect(mockedUpdatePreferences).toHaveBeenCalledWith({
                theme: 'DARK',
                currency: 'ZAR',
                language: 'en',
                reducedMotion: true,
            })
        })

        expect(await screen.findByText(/preferences saved/i)).toBeInTheDocument()
    })


    it('shows error feedback when the save fails', async()=> {
        mockedUpdatePreferences.mockRejectedValue(new Error('404'))
        renderPage()
        fireEvent.click(screen.getByRole('button', {name: /save preferences/i}))

        expect(await screen.findByText(/couldn't save preferences/i)).toBeInTheDocument()
    })


    it('applies the loaded reducedMotion preference to the document', ()=> {
        mockedProfile.user.preferences.reducedMotion=true
        renderPage()
        expect(document.documentElement).toHaveClass('reduce-motion')

        mockedProfile.user.preferences.reducedMotion=false
    })

    it('applies reduced motion on toggle, before the preferences are saved', ()=> {
        renderPage()
        expect(document.documentElement).not.toHaveClass('reduce-motion')

        fireEvent.click(screen.getByRole('switch', {name: /reduced motion/i}))

        expect(document.documentElement).toHaveClass('reduce-motion')
        expect(mockedUpdatePreferences).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole('switch', {name: /reduced motion/i}))
        expect(document.documentElement).not.toHaveClass('reduce-motion')
    })
})