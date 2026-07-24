import React from 'react'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import '@testing-library/jest-dom'

import SettingsAccountPage from '../domains/SettingsAccountPage'
import {signOut} from '../features/auth/auth.service'
import {deactivateAccount, exportUserData} from '../features/profile/profileApi'

vi.mock('@/features/auth/auth.service', ()=> ({
    signOut: vi.fn(),
}))

vi.mock('@/features/profile/profileApi', ()=>({
    deactivateAccount: vi.fn(),
    exportUserData: vi.fn(),
}))

const mockedSignOut=vi.mocked(signOut)
const mockedDeactivate=vi.mocked(deactivateAccount)
const mockedExport=vi.mocked(exportUserData)

function renderPage(){
    return render(
        <MemoryRouter>
            <SettingsAccountPage/>
        </MemoryRouter>
    )
}

function deactivateButton(){
    return screen.getByRole('button', {name: /deactivate my account/i})
}

describe('SettingsAccountPage', ()=>{
    beforeEach(()=> {
        vi.clearAllMocks()
        globalThis.URL.createObjectURL=vi.fn(()=> 'blob.mock')
        globalThis.URL.revokeObjectURL=vi.fn()
    })

    it('keeps deactivation disabled until the exact confirmation is typed', ()=> {
        renderPage()
        const input=screen.getByLabelText(/type delete to confirm/i)
        expect(deactivateButton()).toBeDisabled()

        fireEvent.change(input, {target: {value: 'delete'}})
        expect(deactivateButton()).toBeDisabled()

        fireEvent.change(input, {target: {value: 'DELETE '}})//trailing space
        expect(deactivateButton()).toBeDisabled()

        fireEvent.change(input, {target: {value: 'DELETE'}})
        expect(deactivateButton()).toBeEnabled()
    })

    it('deactivates then signs out when confirmed', async()=> {
        mockedDeactivate.mockResolvedValue({data: {deactivated: true}})
        mockedSignOut.mockResolvedValue(undefined)
        renderPage()

        fireEvent.change(screen.getByLabelText(/type delete to confirm/i), {target: {value: 'DELETE'}})
        fireEvent.click(deactivateButton())

        await waitFor(()=> {
            expect(mockedDeactivate).toHaveBeenCalledTimes(1)
            expect(mockedSignOut).toHaveBeenCalledTimes(1)
        })
    })


    it('shows error feedback and does not sign out when deactivation fails', async()=> {
        mockedDeactivate.mockRejectedValue(new Error('404'))
        renderPage()

        fireEvent.change(screen.getByLabelText(/type delete to confirm/i), {target: {value: 'DELETE'}})
        fireEvent.click(deactivateButton())

        expect(await screen.findByText(/couldn't deactivate/i)).toBeInTheDocument()
        expect(mockedSignOut).not.toHaveBeenCalled()
    })

    it('logs out via signOut', async()=> {
        mockedSignOut.mockResolvedValue(undefined)
        renderPage()

        fireEvent.click(screen.getByRole('button', {name: /log out/i}))

        await waitFor(()=> {
            expect(mockedSignOut).toHaveBeenCalledTimes(1)

        })
        expect(mockedDeactivate).not.toHaveBeenCalled()
    })

    it('downloads the data export as a JSON blob', async()=>{
        mockedExport.mockResolvedValue({data: {user: {displayName: 'Rachel C'}}})
        renderPage()

        fireEvent.click(screen.getByRole('button', {name: /export/i}))

        await waitFor(()=> {
            expect(mockedExport).toHaveBeenCalledTimes(1)
            expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1)

        })

        expect(await screen.findByText(/export has downloaded/i)).toBeInTheDocument()
    })

    it('shows error feedback when the export fails', async()=> {
        mockedExport.mockRejectedValue(new Error('404'))
        renderPage()

        fireEvent.click(screen.getByRole('button', {name: /export/i}))

        expect(await screen.findByText(/couldn't export your data/i)).toBeInTheDocument()
    })

})
