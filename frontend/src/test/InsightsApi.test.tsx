import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {getInsights} from '../features/insights/insightsApi'
import {apiFetch} from '../lib/api'

vi.mock('../lib/api', ()=> ({
    apiFetch: vi.fn(),
}))

const mockedApiFetch=vi.mocked(apiFetch)

describe('insightsApi', ()=> {
    beforeEach(()=> {
        vi.clearAllMocks()
    })
    afterEach(()=> {
        vi.restoreAllMocks()
    })

    it('GETs /insights', async()=> {
        mockedApiFetch.mockResolvedValue({data: {asOf: '2026-07-22T00:00:00Z', insights: []}})
        await getInsights()
        expect(mockedApiFetch).toHaveBeenCalledWith('/insights')
    })

    it('passes the envelope response through unchanged', async()=> {
        const envelope={
            data: {
                asOf: '2026-07-22T00:00:00Z',
                insights: [
                    {key: 'on-time-rate', title: 'On-time payment rate', value: '92%', explanation: 'Great job', severity: 'positive'},
                ],
            },
        }

        mockedApiFetch.mockResolvedValue(envelope)
        const result =await getInsights()
        expect(result).toBe(envelope)
    })

    it('propagates fetch errors rather than swallowing them', async()=> {
        mockedApiFetch.mockRejectedValue(new Error('401'))
        await expect(getInsights()).rejects.toThrow('401')
    })
})