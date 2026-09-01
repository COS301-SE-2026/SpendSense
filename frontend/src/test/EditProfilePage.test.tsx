import React from 'react'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'

import EditProfilePage from '../domains/EditProfilePage'
import {updateMe} from '../features/users/usersApi'

const mockedUser = {
  displayName: 'Rachel C',
  email: 'rachel@example.com',
  avatarUrl: null,
  memberSince: 'March 2026',
  level: 6,
  tier: 'Good',
  coins: 1250,
  paymentStreak: 28,
  preferences: null,
}
const mockedHookReturn = {
  user: mockedUser,
  loading: false,
  error: null,
  refetch: vi.fn(),
}

vi.mock('@/hooks/useUserProfile', ()=> ({
  useUserProfile: ()=> mockedHookReturn, 
  initialsFor: (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U',
}))


vi.mock('@/features/users/usersApi', ()=> ({
    updateMe: vi.fn(),
}))


const mockedUpdateMe=vi.mocked(updateMe)

function renderPage(){
    return render(
        <MemoryRouter>
            <EditProfilePage/>
        </MemoryRouter>
    )
}

function nameInput(){
    return screen.getByLabelText(/display name/i)
}

function saveButton(){
    return screen.getByRole('button', {name: /save changes/i})
}


describe('EditProfilePage', ()=>{
    beforeEach(()=> {
        vi.clearAllMocks()
    })

    it('prefills the display name and shows email read-only', ()=> {
        renderPage()
        expect(nameInput()).toHaveValue('Rachel C')
        expect(screen.getByText('rachel@example.com')).toBeInTheDocument()
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    })

    it('blocks an empty display name', async () => {
        const user = userEvent.setup()
        renderPage()
        await user.clear(nameInput())
        await user.type(nameInput(), '   ')
        expect(screen.getByText(/can't be empty/i)).toBeInTheDocument()
        expect(saveButton()).toBeDisabled()
})

    it('allows exactly 80 characters in the display name', ()=>{
        renderPage()
        fireEvent.change(nameInput(), {target: {value: 'a'.repeat(80)}})
        expect(screen.queryByText(/80 characters or fewer/i)).not.toBeInTheDocument()
        expect(saveButton()).toBeEnabled()
    })

    it('blocks 81 characters in display name', ()=>{
        renderPage()
        fireEvent.change(nameInput(), {target: {value: 'a'.repeat(81)}})
        expect(screen.getByText(/80 characters or fewer/i)).toBeInTheDocument()
        expect(saveButton()).toBeDisabled()

    })


    it('saves the trimmed display name via updateMe and shows success feedback', async()=>{
        mockedUpdateMe.mockResolvedValue({data: {}})
        renderPage()
        fireEvent.change(nameInput(), {target: {value: ' Rachel Clifford '}})
        fireEvent.click(saveButton())

        await waitFor(()=> {
            expect(mockedUpdateMe).toHaveBeenCalledWith({displayName: 'Rachel Clifford'})
        })

        expect(await screen.findByText(/profile updated/i)).toBeInTheDocument()
    })

    it('shows error feedback when the save fails', async ()=> {
        mockedUpdateMe.mockRejectedValue(new Error('404'))
        renderPage()
        fireEvent.change(nameInput(), {target: {value: 'Rachel CLifford'}})
        fireEvent.click(saveButton())

        expect(await screen.findByText(/couldn't save your changes/i)).toBeInTheDocument()
    })

    it('shows a specific message when the display name is already taken', async ()=> {
        mockedUpdateMe.mockRejectedValue(
            Object.assign(new Error('Display name is already taken'), {statusCode: 409}),
        )
        renderPage()
        fireEvent.change(nameInput(), {target: {value: 'Rachel CLifford'}})
        fireEvent.click(saveButton())

        expect(await screen.findByText(/already taken/i)).toBeInTheDocument()
    })
})
