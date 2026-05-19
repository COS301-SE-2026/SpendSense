import {apiFetch} from '../../lib/api'

// remindersApi: reminder preference settings
// controls when and how the user receives payment reminders
// channels: IN_APP, EMAIL, PUSH, SMS
// note: individual obligation reminders are set at obligation creation time
// this file manages global user-level reminder preferences

// planned endpoints:
// GET /api/v1/reminder-preferences
// PATCH /api/v1/reminder-preferences

export async function getReminderPreferences(){
    return apiFetch('/reminder-preferences')
}

export async function updateReminderPreferences(body:{
    inAppEnabled?: boolean
    emailEnabled?: boolean
    pushEnabled?: boolean
    smsEnabled?: boolean
    defaultReminderDaysBefore?: number
    quietHoursStart?: string | null
    quietHoursEnd?: string | null
}) 
{
    return apiFetch('/reminder-preferences', {method: 'PATCH', body: JSON.stringify(body)})
}