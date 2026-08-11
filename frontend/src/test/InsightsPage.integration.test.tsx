import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {MemoryRouter, Routes, Route} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import '@testing-library/jest-dom'
import InsightsPage from '../domains/InsightsPage'
import ProfilePage from '../domains/ProfilePage'
import WrappedPage from '../domains/WrappedPage'
import {apiFetch} from '../lib/api'

vi.mock('../lib/api', ()=> ({
    apiFetch: vi.fn(),
}))

vi.mock('../hooks/useUserProfile', ()=> {
    const stableUser={
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
    const stableReturn={
        user: stableUser,
        loading: false,
        error: null,
        refetch: vi.fn(),
    }
    return{
        useUserProfile: ()=> stableReturn,
        initialsFor: (name:string)=>
            name.split(/\s+/).filter(Boolean).slice(0, 2).map((p)=>p[0]?.toUpperCase() ?? '').join('') || 'U',
    }
})

vi.mock('@/components/common/BottomNav', ()=> ({
    BottomNav: ()=> <nav data-testid="bottom-nav"/>
}))

const mockedApiFetch =vi.mocked(apiFetch)

const sampleInsightsResponse={
    data: {
        asOf: '2026-07-22T00:00:00Z',
        insights: [
            {
                key: 'on-time-rate' as const,
                title: 'On-time payment rate',
                value: '92%',
                explanation: '11 of 12 eligible payments were on time.',
                severity: 'positive' as const,
            },

            {
                key: 'obligation-trend' as const,
                title: 'Monthly obligations',
                value: 'R4500',
                explanation: 'Up 12% from last month',
                severity: 'warning' as const,
                link: '/obligations',
            },

            {
                key: 'upcoming-pressure' as const,
                title: 'Next 14 days',
                value: 'R2300',
                explanation: '3 payments are due across 2 obligations.',
                severity: 'critical' as const,
            },
        ],
    },
}

function renderInsightsRoute(){
    return render(
        <MemoryRouter initialEntries={['/insights']}>
            <Routes>
                <Route path="/insights" element={<InsightsPage/>}/>
            </Routes>
        </MemoryRouter>
    )
}

function renderProfileAndWrappedRoutes(){
    return render(
        <MemoryRouter initialEntries={['/profile']}>
            <Routes>
                <Route path="/profile" element={<ProfilePage/>}/>
                <Route path="/wrapped" element={<WrappedPage />}/>
            </Routes>
        </MemoryRouter>
    )
}

describe('Insights integration', ()=>{
    beforeEach(()=> {
        vi.clearAllMocks()
    })

    it('fetches /insights and renders every card returned by the server', async()=> {
        mockedApiFetch.mockResolvedValueOnce(sampleInsightsResponse)
        renderInsightsRoute()
        expect(screen.getByText(/loading your insights/i)).toBeInTheDocument()

        await waitFor(()=> {
            expect(screen.getByText('On-time payment rate')).toBeInTheDocument()
        })

        expect(mockedApiFetch).toHaveBeenCalledWith('/insights')
        expect(mockedApiFetch).toHaveBeenCalledTimes(1)

        expect(screen.getByText('Monthly obligations')).toBeInTheDocument()
        expect(screen.getByText('Next 14 days')).toBeInTheDocument()
    })

    it('renders a Link wrapper only for cards the server marks with a link', async()=> {
        mockedApiFetch.mockResolvedValueOnce(sampleInsightsResponse)
        renderInsightsRoute()

        await waitFor(()=> {
            expect(screen.getByText('Monthly obligations')).toBeInTheDocument()
        })

        const linkedCard =screen.getByText('Monthly obligations').closest('a')
        expect(linkedCard).toHaveAttribute('href', '/obligations')
        const unlinkedCard =screen.getByText('On-time payment rate').closest('a')
        expect(unlinkedCard).toBeNull()
    })

    it('surfaces the error state when the request fails, and refetches on retry', async()=> {
        mockedApiFetch.mockRejectedValueOnce(new Error('500'))
        mockedApiFetch.mockResolvedValueOnce(sampleInsightsResponse)

        renderInsightsRoute()
        await waitFor(()=> {
            expect(screen.getByText(/couldn't load your insights/i)).toBeInTheDocument()
        })

        fireEvent.click(screen.getByRole('button', {name: /try again/i}))

        await waitFor(()=> {
            expect(screen.getByText('On-time payment rate')).toBeInTheDocument()
        })

        expect(mockedApiFetch).toHaveBeenCalledTimes(2)

    })

    it('shows the empty state when the server returns no insights', async()=> {
        mockedApiFetch.mockResolvedValueOnce({
            data: {asOf: '2026-07-22T00:00:00Z', insights: []},
        })
        renderInsightsRoute()

        await waitFor(()=> {
            expect(screen.getByText(/no insights available yet/i)).toBeInTheDocument()
        })
    })

    it('handles the "Not enough data" case for any insight card', async()=> {
        mockedApiFetch.mockResolvedValueOnce({
            data: {
                asOf: '2026-07-22T00:00:00Z',
                insights: [
                    {
                        key: 'category-breakdown' as const,
                        title: 'Largest obligation type',
                        value: 'Not enough data',
                        explanation: 'No obligation amounts are scheduled for this month yet.',
                        severity: 'info' as const,
                    },
                ],
            },
        })

        renderInsightsRoute()

        await waitFor(()=> {
            expect(screen.getByText('Largest obligation type')).toBeInTheDocument()

        })
        expect(screen.getByText('Not enough data')).toBeInTheDocument()
        expect(screen.getByText(/no obligation amounts are scheduled/i)).toBeInTheDocument()
    })

    it('navigates from the Profile "Wrapped" row to /wrapped', async()=> {
        renderProfileAndWrappedRoutes()

        const wrappedRow=screen.getByRole('link', {name: /wrapped/i})
        expect(wrappedRow).toHaveAttribute('href', '/wrapped')

        fireEvent.click(wrappedRow)

        await waitFor(()=> {
            expect(screen.getByText('Your monthly highlights')).toBeInTheDocument()
        })
    })

    it('displays the as-of date returned by the server', async()=> {
        mockedApiFetch.mockResolvedValueOnce(sampleInsightsResponse)
        renderInsightsRoute()
        await waitFor(()=> {
            expect(screen.getByText(/as of/i)).toBeInTheDocument()
        })
    })
})