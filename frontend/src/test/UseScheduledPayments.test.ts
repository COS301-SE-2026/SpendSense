import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'

import {getUpcomingOccurrences} from '../features/payments/paymentsApi'
import {
	findAnchorMonthKey,
	getMonthKey,
	withCurrentMonth,
	getScheduleWindow,
	groupByMonth,
	useScheduledPayments,
} from '../hooks/useScheduledPayments'
import type {CalendarOccurrence} from '../hooks/useCalendarOccurrences'

vi.mock('@/features/payments/paymentsApi', ()=> ({
	getUpcomingOccurrences: vi.fn(),
}))

const mockedGetUpcoming = vi.mocked(getUpcomingOccurrences)

function occurrence(overrides: Partial<CalendarOccurrence> & {id: string; dueDate: string}): CalendarOccurrence{
	return {
		amountDue: 100,
		currency: 'ZAR',
		status: 'PENDING',
		sequenceNumber: 1,
		daysUntilDue: 5,
		riskLevel: 'LOW',
		obligation: {id: 'obl-1', name: 'Netflix', type: 'SUBSCRIPTION', priority: 'MEDIUM'},
		reminders: [],
		...overrides,
	} as CalendarOccurrence
}

function page(items: CalendarOccurrence[], totalPages = 1){
	return {data: {data: items, meta: {totalPages}}}
}

describe('getScheduleWindow', ()=> {
	it('spans a year back and two years forward, on whole month boundaries', ()=> {
		expect(getScheduleWindow(new Date('2026-09-15T00:00:00.000Z'))).toEqual({
			from: '2025-09-01',
			to: '2028-09-30',
		})
	})
 
	it('rolls the year correctly near January', ()=> {
		expect(getScheduleWindow(new Date('2026-01-05T00:00:00.000Z')).from).toBe('2025-01-01')
	})
})

describe('findAnchorMonthKey', ()=> {
    const today = new Date('2026-09-15T00:00:00.000Z')
 
	it('reads the month key in UTC', ()=> {
		expect(getMonthKey(today)).toBe('2026-09')
	})
 
	it('picks the current month when it has payments', ()=> {
		const anchor = findAnchorMonthKey([{key: '2026-07'},{key: '2026-09'},{key: '2026-11'}], today)
		expect(anchor).toBe('2026-09')
	})
 
	it('falls forward to the next month with payments when this one is empty', ()=> {
		const anchor = findAnchorMonthKey([{key: '2026-07'},{key: '2026-11'}], today)
		expect(anchor).toBe('2026-11')
	})

    it('crosses a year boundary when looking forward', ()=> {
		const anchor = findAnchorMonthKey([{key: '2026-02'},{key: '2027-01'}], today)
		expect(anchor).toBe('2027-01')
	})
 
	it('falls back to the most recent past month, not the oldest', ()=> {
		expect(findAnchorMonthKey([{key: '2026-03'},{key: '2026-07'}], today)).toBe('2026-07')
	})
 
	it('returns nothing for an empty schedule', ()=> {
		expect(findAnchorMonthKey([], today)).toBeNull()
	})
})

describe('groupByMonth', ()=> {
    it('groups occurrences into months in chronological order', ()=> {
		const months = groupByMonth([
			occurrence({id: 'b', dueDate: '2026-10-05T00:00:00.000Z'}),
			occurrence({id: 'a', dueDate: '2026-09-01T00:00:00.000Z'}),
			occurrence({id: 'c', dueDate: '2026-10-25T00:00:00.000Z'}),
		])
 
		expect(months.map((m)=> m.key)).toEqual(['2026-09','2026-10'])
		expect(months[1].occurrences.map((o)=> o.id)).toEqual(['b','c'])
	})

    it('labels each month with its name and year', ()=> {
		const months = groupByMonth([occurrence({id: 'a', dueDate: '2026-09-01T00:00:00.000Z'})])
		expect(months[0].label).toMatch(/September 2026/)
	})

    it('buckets a first-of-month date into that month, not the previous one', ()=> {
		const months = groupByMonth([occurrence({id: 'a', dueDate: '2026-09-01T00:00:00.000Z'})])
		expect(months[0].key).toBe('2026-09')
	})

    it('totals the month but leaves cancelled occurrences out of the sum', ()=> {
		const months = groupByMonth([
			occurrence({id: 'a', dueDate: '2026-09-01T00:00:00.000Z', amountDue: 500}),
			occurrence({id: 'b', dueDate: '2026-09-10T00:00:00.000Z', amountDue: 250}),
			occurrence({id: 'c', dueDate: '2026-09-12T00:00:00.000Z', amountDue: 999, status: 'CANCELLED'}),
		])
 
		expect(months[0].total).toBe(750)
		expect(months[0].occurrences).toHaveLength(3)
	})

    it('returns nothing for an empty schedule', ()=> {
		expect(groupByMonth([])).toEqual([])
	})
})

describe('withCurrentMonth', ()=> {
	const today = new Date('2026-09-15T00:00:00.000Z')
 
	function month(key: string){
		return {key, label: key, occurrences: [], total: 0}
	}
 
	it('inserts an empty current month when the schedule stops short of today', ()=> {
		const months = withCurrentMonth([month('2026-06'), month('2026-07')], today)
 
		expect(months.map((m)=> m.key)).toEqual(['2026-06','2026-07','2026-09'])
		expect(months[2].occurrences).toEqual([])
		expect(months[2].label).toMatch(/September 2026/)
	})
 
	it('keeps it in chronological position when later months exist', ()=> {
		const months = withCurrentMonth([month('2026-07'), month('2026-12')], today)
		expect(months.map((m)=> m.key)).toEqual(['2026-07','2026-09','2026-12'])
	})
 
	it('leaves the list alone when the current month is already there', ()=> {
		const input = [month('2026-09')]
		expect(withCurrentMonth(input, today)).toBe(input)
	})
 
	it('does not invent a month for a user with no payments at all', ()=> {
		expect(withCurrentMonth([], today)).toEqual([])
	})
})
 
describe('useScheduledPayments', ()=> {
	beforeEach(()=> {
		vi.clearAllMocks()
	})
 
	it('follows pagination until every page is collected', async()=> {
		mockedGetUpcoming
			.mockResolvedValueOnce(page([occurrence({id: 'a', dueDate: '2026-09-01T00:00:00.000Z'})], 2))
			.mockResolvedValueOnce(page([occurrence({id: 'b', dueDate: '2026-10-01T00:00:00.000Z'})], 2))
 
		const {result} = renderHook(()=> useScheduledPayments())
 
		await waitFor(()=> {
			expect(result.current.loading).toBe(false)
		})
 
		expect(mockedGetUpcoming).toHaveBeenCalledTimes(2)
		expect(result.current.months).toHaveLength(2)
	})
 
	it('requests settled statuses too, so history is visible alongside what is owed', async()=> {
		mockedGetUpcoming.mockResolvedValue(page([]))
 
		renderHook(()=> useScheduledPayments())
 
		await waitFor(()=> {
			expect(mockedGetUpcoming).toHaveBeenCalled()
		})
 
		const status = mockedGetUpcoming.mock.calls[0]?.[0]?.status ?? ''
		expect(status.split(',')).toEqual(
			expect.arrayContaining(['PENDING','OVERDUE','MISSED','PAID','PAID_LATE','CANCELLED']),
		)
	})
 
	it('surfaces an error and clears the list when the request fails', async()=> {
		mockedGetUpcoming.mockRejectedValue(new Error('Network down'))
 
		const {result} = renderHook(()=> useScheduledPayments())
 
		await waitFor(()=> {
			expect(result.current.error).toBe('Network down')
		})
 
		expect(result.current.months).toEqual([])
	})
})