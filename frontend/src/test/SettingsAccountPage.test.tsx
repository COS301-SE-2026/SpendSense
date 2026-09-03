import React from 'react'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import '@testing-library/jest-dom'

import SettingsAccountPage from '../domains/SettingsAccountPage'
import {signOut} from '../features/auth/auth.service'
import {deactivateAccount, exportUserData, deleteAllUserData} from '../features/profile/profileApi'

vi.mock('@/features/auth/auth.service', ()=> ({
    signOut: vi.fn(),
}))

vi.mock('@/features/profile/profileApi', ()=>({
    deactivateAccount: vi.fn(),
    exportUserData: vi.fn(),
    deleteAllUserData: vi.fn(),
}))

const mockedSignOut=vi.mocked(signOut)
const mockedDeactivate=vi.mocked(deactivateAccount)
const mockedExport=vi.mocked(exportUserData)
const mockedDeleteData=vi.mocked(deleteAllUserData)

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

function deleteDataButton(){
    return screen.getByRole('button', {name: /delete all my data/i})
}

function deleteDataInput(){
    return screen.getByLabelText(/type delete my data to confirm/i)
}

const deletionReceipt={
    data: {
        deleted: true,
        deletedAt: '2026-07-21T10:00:00.000Z',
        recordsDeleted: {obligations: 4, user: 1},
    },
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


describe('SettingsAccountPage POPIA data deletion', ()=> {
    beforeEach(()=> {
        vi.clearAllMocks()
        globalThis.URL.createObjectURL=vi.fn(()=> 'blob.mock')
        globalThis.URL.revokeObjectURL=vi.fn()
    })

    it('explains the POPIA right and that the deletion is irreversible', ()=> {
        renderPage()

        expect(screen.getByText(/section 24 of the protection of personal information act/i)).toBeInTheDocument()
        expect(screen.getByText(/cannot be undone and nothing is kept/i)).toBeInTheDocument()
    })

    it('keeps deletion disabled until the exact phrase is typed', ()=> {
        renderPage()
        const input=deleteDataInput()
        expect(deleteDataButton()).toBeDisabled()

        fireEvent.change(input, {target: {value: 'DELETE'}})
        expect(deleteDataButton()).toBeDisabled()

        fireEvent.change(input, {target: {value: 'delete my data'}})
        expect(deleteDataButton()).toBeDisabled()

        fireEvent.change(input, {target: {value: 'DELETE MY DATA '}})//trailing space
        expect(deleteDataButton()).toBeDisabled()

        fireEvent.change(input, {target: {value: 'DELETE MY DATA'}})
        expect(deleteDataButton()).toBeEnabled()
    })

    it('does not arm deletion when the deactivation phrase is typed instead', ()=> {
        renderPage()

        fireEvent.change(screen.getByLabelText(/type delete to confirm/i), {target: {value: 'DELETE'}})

        expect(deactivateButton()).toBeEnabled()
        expect(deleteDataButton()).toBeDisabled()
    })

    it('deletes the data then signs out when confirmed', async()=> {
        mockedDeleteData.mockResolvedValue(deletionReceipt)
        mockedSignOut.mockResolvedValue(undefined)
        renderPage()

        fireEvent.change(deleteDataInput(), {target: {value: 'DELETE MY DATA'}})
        fireEvent.click(deleteDataButton())

        await waitFor(()=> {
            expect(mockedDeleteData).toHaveBeenCalledTimes(1)
            expect(mockedSignOut).toHaveBeenCalledTimes(1)
        })

        expect(mockedDeactivate).not.toHaveBeenCalled()
    })

    it('shows error feedback and keeps the session when deletion fails', async()=> {
        mockedDeleteData.mockRejectedValue(new Error('500'))
        renderPage()

        fireEvent.change(deleteDataInput(), {target: {value: 'DELETE MY DATA'}})
        fireEvent.click(deleteDataButton())

        expect(await screen.findByText(/couldn't delete your data/i)).toBeInTheDocument()
        expect(mockedSignOut).not.toHaveBeenCalled()
    })

    it('disables the other account actions while deletion is in flight', async()=> {
        let resolveDelete: (value: typeof deletionReceipt)=> void = ()=> undefined
        mockedDeleteData.mockReturnValue(new Promise((resolve)=> {resolveDelete=resolve}))
        renderPage()

        fireEvent.change(deleteDataInput(), {target: {value: 'DELETE MY DATA'}})
        fireEvent.click(deleteDataButton())

        expect(await screen.findByRole('button', {name: /deleting your data/i})).toBeDisabled()
        expect(screen.getByRole('button', {name: /log out/i})).toBeDisabled()
        expect(screen.getByRole('button', {name: /export/i})).toBeDisabled()

        await act(async()=> {resolveDelete(deletionReceipt)})
    })
})