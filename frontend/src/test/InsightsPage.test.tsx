import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import '@testing-library/jest-dom'
import InsightsPage from '../domains/InsightsPage'
import {useInsights} from '../hooks/useInsights'

vi.mock('@/hooks/useInsights', ()=> ({
    useInsights: vi.fn(),
}))


const mockedUseInsights =vi.mocked(useInsights)

const sampleInsights=[
    {
        key: 'on-time-rate' as const,
        title: 'On-time payment rate',
        value: '92%',
        explanation: '11 of 12 eligible payments were on time. Unchanged from last month.',
        severity: 'positive'as const,
    },

    {
        key: 'obligation-trend' as const,
        title: 'Monthly obligations',
        value: 'R4500',
        explanation: 'Up 12% (R500) from last month.',
        severity: 'warning' as const,
    },

    {
        key: 'upcoming-pressure' as const,
        title: 'Next 14 days',
        value: 'R2300',
        explanation: '3 payments are due across 2 obligations',
        severity: 'critical' as const,
    },
    {
        key: 'category-breakdown' as const,
        title: 'Largest obligation type',
        value: 'Not enough data',
        explanation: 'No obligation amounts are scheduled for this month yet.',
        severity: 'info' as const,
    },

]

function renderPage(){
    return render(
        <MemoryRouter>
            <InsightsPage/>
        </MemoryRouter>
    )
}

describe('InsightsPage', ()=>{
    beforeEach(()=> {
        vi.clearAllMocks()
    })

    it('shows the loading while fetching', ()=> {
        mockedUseInsights.mockReturnValue({asOf: null, insights: [], loading:true, error: null, refetch: vi.fn()})
        renderPage()
        expect(screen.getByText(/loading your insights/i)).toBeInTheDocument()

    })

    it('shows the error state with a retry that refetches', ()=> {
        const refetch=vi.fn()
        mockedUseInsights.mockReturnValue({asOf: null, insights:[], loading: false, error: 'boom', refetch})
        renderPage()
        expect(screen.getByText(/couldn't load your insights/i)).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', {name: /try again/i}))
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders each server-provided insight card', ()=> {
        mockedUseInsights.mockReturnValue({
            asOf: '2026-07-22T00:00:00Z',
            insights: sampleInsights,
            loading: false,
            error: null,
            refetch: vi.fn(),
        })
        renderPage()

        expect(screen.getByText('On-time payment rate')).toBeInTheDocument()
        expect(screen.getByText("92%")).toBeInTheDocument()
        expect(screen.getByText(/11 of 12 eligible payments were on time/i)).toBeInTheDocument()
        expect(screen.getByText('Monthly obligations')).toBeInTheDocument()
        expect(screen.getByText(/R.*4.*500/)).toBeInTheDocument()
        expect(screen.getByText('Next 14 days')).toBeInTheDocument()
        expect(screen.getByText(/R.*2.*300/)).toBeInTheDocument()
        expect(screen.getByText('Largest obligation type')).toBeInTheDocument()
        expect(screen.getAllByText(/not enough data/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows the as-of date when provided', ()=> {
        mockedUseInsights.mockReturnValue({
            asOf: '2026-07-22T00:00:00Z',
            insights: sampleInsights,
            loading: false,
            error: null,
            refetch: vi.fn(),
        })
        renderPage()
        expect(screen.getByText(/as of/i)).toBeInTheDocument()
    })

    it('renders an empty state when the server returns no insights', ()=> {
        mockedUseInsights.mockReturnValue({
            asOf: '2026-07-22T00:00:00Z',
            insights: [],
            loading: false,
            error: null,
            refetch: vi.fn(),
        })

        renderPage()
        expect(screen.getByText(/no insights available yet/i)).toBeInTheDocument()
    })
    
    it('renders the Wrapped promo link',()=>{
        mockedUseInsights.mockReturnValue({
            asOf:'2026-07-22T00:00:00Z',
            insights:sampleInsights,
            loading:false,
            error:null,
            refetch:vi.fn(),
        })
        renderPage()
        const wrappedLink=screen.getByRole('link',{name:/monthly wrapped/i})
        expect(wrappedLink).toHaveAttribute('href','/wrapped')
    })

    it('wraps a card in a link when the server provides a link, and does not otherwise', ()=> {
        mockedUseInsights.mockReturnValue({
            asOf: '2026-07-22T00:00:00Z',
            insights: [
                {...sampleInsights[0], link:'/payments'},
                {...sampleInsights[1], link: undefined},
            ],
            loading: false,
            error: null,
            refetch: vi.fn(),
        })
        renderPage()

        const linkedTitle = screen.getByText(sampleInsights[0].title)
        expect(linkedTitle.closest('a')).toHaveAttribute('href', '/payments')
        const unlinkedTitle = screen.getByText(sampleInsights[1].title)
        expect(unlinkedTitle.closest('a')).toBeNull()
    })
})
