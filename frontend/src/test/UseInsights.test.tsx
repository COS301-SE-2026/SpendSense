import {renderHook, waitFor, act} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {useInsights} from '../hooks/useInsights'
import  {getInsights} from '../features/insights/insightsApi'

vi.mock('@/features/insights/insightsApi', ()=> ({
    getInsights: vi.fn(),
}))

const mockedGetInsights =vi.mocked(getInsights)

const sampleInsight={
    key: 'on-time-rate' as const,
    title: 'On-time payment rate',
    value: '92%',
    explanation: '11 of 12 eligible payments were on time.',
    severity: 'positive' as const,
}

describe('useInsights', ()=> {
    beforeEach(()=> {
        vi.clearAllMocks()
    })

    it('starts in the loading state', ()=> {
        mockedGetInsights.mockReturnValue(new Promise(()=> {}))
        const {result}=renderHook(()=> useInsights())
        expect(result.current.loading).toBe(true)
        expect(result.current.insights).toEqual([])
        expect(result.current.asOf).toBeNull()
        expect(result.current.error).toBeNull()
    })

    it('unwraps the {data...} envelope on success', async()=> {
        mockedGetInsights.mockResolvedValue({
            data: {asOf: '2026-07-22T00:00:00Z', insights: [sampleInsight]},

        })
        const {result} =renderHook(()=> useInsights())
        await waitFor(()=> expect(result.current.loading).toBe(false))
        expect(result.current.insights).toEqual([sampleInsight])
        expect(result.current.asOf).toBe('2026-07-22T00:00:00Z')
        expect(result.current.error).toBeNull()
    })

    it('returns empty arrays when the endpoint responds with no insights', async ()=> {
        mockedGetInsights.mockResolvedValue({data: {asOf: '2026-07-22T00:00:00Z', insights: []}})
        const {result}=renderHook(()=> useInsights())
        await waitFor(()=> expect(result.current.loading).toBe(false))
        expect(result.current.insights).toEqual([])
        expect(result.current.error).toBeNull()
    })

    it('sets error and clears data on fetch failure', async ()=> {
        mockedGetInsights.mockRejectedValue(new Error('401'))
        const {result}=renderHook(()=> useInsights())
        await waitFor(()=> expect(result.current.loading).toBe(false))
        expect(result.current.error).toBe('401')
        expect(result.current.insights).toEqual([])
        expect(result.current.asOf).toBeNull()
    })

    it('refetches on demand and recovers from and earlier error', async()=> {
        mockedGetInsights.mockRejectedValueOnce(new Error('500'))
        mockedGetInsights.mockResolvedValueOnce({
            data: {asOf: '2026-07-22T00:00:00Z', insights: [sampleInsight]},

        })

        const {result}=renderHook(()=> useInsights())
        await waitFor(()=> expect(result.current.error).toBe('500'))
        await act(async()=> {
            result.current.refetch()
        })

        await waitFor(()=> expect(result.current.loading).toBe(false))
        expect(result.current.error).toBeNull()
        expect(result.current.insights).toEqual([sampleInsight])
    })
})