import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {getUpcomingOccurrences} from '../features/payments/paymentsApi'
import {getMonthBounds, useCalendarOccurrences} from '../hooks/useCalendarOccurrences'

vi.mock('@/features/payments/paymentsApi', ()=> ({
    getUpcomingOccurrences: vi.fn(),
}))

const mockedGetUpcoming = vi.mocked(getUpcomingOccurrences)
 
function emptyResponse(){
    return {data: {data: [], meta: {}}}
}

describe('getMonthBounds', ()=> {
    it('returns the true first and last calendar day of the month', ()=> {
        expect(getMonthBounds(2026, 6)).toEqual({from: '2026-07-01', to: '2026-07-31'})
    })
 
    it('handles the 30 day and February cases', ()=> {
        expect(getMonthBounds(2026, 8)).toEqual({from: '2026-09-01', to: '2026-09-30'})
        expect(getMonthBounds(2026, 1)).toEqual({from: '2026-02-01', to: '2026-02-28'})
        expect(getMonthBounds(2028, 1)).toEqual({from: '2028-02-01', to: '2028-02-29'})
    })
 
    it('pads single digit months and days', ()=> {
        expect(getMonthBounds(2026, 0).from).toBe('2026-01-01')
    })
})

describe('useCalendarOccurrences', ()=> {
    beforeEach(()=> {
        vi.clearAllMocks()
        mockedGetUpcoming.mockResolvedValue(emptyResponse())
    })

    it('requests the settled statuses too, not just what is still owed', async()=> {
        renderHook(()=> useCalendarOccurrences())
 
        await waitFor(()=> {
            expect(mockedGetUpcoming).toHaveBeenCalledTimes(1)
        })
 
        const status = mockedGetUpcoming.mock.calls[0]?.[0]?.status ?? ''
        const requested = status.split(',')
 
        expect(requested).toContain('PENDING')
        expect(requested).toContain('OVERDUE')
        expect(requested).toContain('MISSED')
        expect(requested).toContain('PAID')
        expect(requested).toContain('PAID_LATE')
    })

    it('asks for the month currently on screen', async()=> {
        vi.setSystemTime(new Date('2026-07-15T09:00:00.000Z'))
 
        renderHook(()=> useCalendarOccurrences())
 
        await waitFor(()=> {
            expect(mockedGetUpcoming).toHaveBeenCalledWith(
                expect.objectContaining({from: '2026-07-01', to: '2026-07-31'}),
            )
        })
 
        vi.useRealTimers()
    })
})