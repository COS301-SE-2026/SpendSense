import React from 'react'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {MemoryRouter} from 'react-router-dom'
import '@testing-library/jest-dom'
import SettingsNotificationsPage from '../domains/SettingsNotificationsPage'
import {getReminderPreferences, updateReminderPreferences} from '../features/reminders/remindersApi'

const mockedPrefs = {
    inAppEnabled: true,
    emailEnabled: true,
    pushEnabled: false,
    smsEnabled: false,
    defaultReminderDaysBefore: 3,
    quietHoursStart: null,
    quietHoursEnd: null,
}

vi.mock('@/features/reminders/remindersApi', () => ({
    getReminderPreferences: vi.fn(),
    updateReminderPreferences: vi.fn(),
}))

const mockedGetReminderPreferences = vi.mocked(getReminderPreferences)
const mockedUpdateReminderPreferences = vi.mocked(updateReminderPreferences)

function renderPage(){
    return render(
        <MemoryRouter>
            <SettingsNotificationsPage/>
        </MemoryRouter>
    )
}

describe('SettingsNotificationsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockedGetReminderPreferences.mockResolvedValue({data: mockedPrefs})
    })

    it('will show a loading state before the preferences arrive', () => {
        mockedGetReminderPreferences.mockReturnValue(new Promise(() => {}))
        renderPage()
        expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('will show a recoverable error state when initial fetch fails', async () => {
        mockedGetReminderPreferences.mockRejectedValue(new Error('500'))
        renderPage()
        expect(await screen.findByText(/couldn't be loaded/i)).toBeInTheDocument()
        expect(screen.getByRole('button', {name: /try again/i})).toBeInTheDocument()
    })

    it('will mark the loaded preference values', async () => {
        renderPage()
        expect(await screen.findByRole('button', {name: '3 days'})).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('switch', {name: /in app notifications/i})).toHaveAttribute('aria-checked', 'true')
    })

    it('will not render email, sms, or push channel toggles', async () => {
        renderPage()
        await screen.findByRole('switch', {name: /in app notifications/i})
        expect(screen.queryByRole('switch', {name: /email notifications/i})).not.toBeInTheDocument()
        expect(screen.queryByRole('switch', {name: /sms notifications/i})).not.toBeInTheDocument()
        expect(screen.queryByRole('switch', {name: /push notifications/i})).not.toBeInTheDocument()
    })

    it('will save a reminder change for the days immediately', async () => {
        mockedUpdateReminderPreferences.mockResolvedValue({data: {}})
        renderPage()
        fireEvent.click(await screen.findByRole('button', {name: '7 days'}))

        await waitFor(() => {
            expect(mockedUpdateReminderPreferences).toHaveBeenCalledWith({defaultReminderDaysBefore: 7})
        })
    })

    it('will save the channel toggle immediately', async () => {
        mockedUpdateReminderPreferences.mockResolvedValue({data: {}})
        renderPage()
        const toggle = await screen.findByRole('switch', {name: /in app notifications/i})
        fireEvent.click(toggle)

        await waitFor(() => {
            expect(mockedUpdateReminderPreferences).toHaveBeenCalledWith({inAppEnabled: false})
        })
        expect(await screen.findByText(/reminder settings saved/i)).toBeInTheDocument()
    })


    it('will show an error feedback when saving fails', async () => {
        mockedUpdateReminderPreferences.mockRejectedValue(new Error('500'))
        renderPage()
        fireEvent.click(await screen.findByRole('switch', {name: /in app notifications/i}))

        expect(await screen.findByText(/couldn't be saved/i)).toBeInTheDocument()
    })
})