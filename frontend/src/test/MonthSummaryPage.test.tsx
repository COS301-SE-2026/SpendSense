
import React from 'react'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import MonthSummaryPage from '../features/simulation/screens/MonthSummaryPage'
import {activeBoardFixture,completedFixture} from '../features/simulation/fixtures/SimulationDetail'
import {getSimulation} from '../features/simulation/api'
import {getGamificationProfile} from '../features/gamification/gamificationApi'

vi.mock('../features/simulation/api',()=>({
    getSimulation:vi.fn()
}))

vi.mock('../features/gamification/gamificationApi',()=>({
    getGamificationProfile:vi.fn()
}))

const mockedGetSimulation=vi.mocked(getSimulation)
const mockedGetGamificationProfile=vi.mocked(getGamificationProfile)

function renderRoute(){
    return render(
        <MemoryRouter initialEntries={['/simulation/session/sim_fixture_1/summary']}>
            <Routes>
                <Route
                    path="/simulation/session/:sessionId/summary"
                    element={<MonthSummaryPage/>}
                />
                <Route
                    path="/simulation/session/:sessionId"
                    element={<p>Board handoff</p>}
                />
                <Route
                    path="/simulation/session/:sessionId/score-breakdown"
                    element={<p>Score breakdown handoff</p>}
                />
                <Route
                    path="/simulation"
                    element={<p>Simulation entry handoff</p>}
                />
                <Route
                    path="/domains/dashboard"
                    element={<p>Dashboard handoff</p>}
                />
            </Routes>
        </MemoryRouter>
    )
}

describe('Month summary and completion flow',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        mockedGetSimulation.mockResolvedValue(completedFixture)
        mockedGetGamificationProfile.mockResolvedValue({
            data:{
                coins:0,
                xp:15,
                mascotLevel:1,
                mascotMood:'NEUTRAL',
                paymentStreak:0,
                longestStreak:0,
                knowledgeStreak:0,
                longestKnowledgeStreak:0,
                badges:[]
            }
        })
    })
    it('renders the completed month summary',async()=>{
        renderRoute()
        expect(await screen.findByText('Month complete!')).toBeInTheDocument()
        expect(screen.getByText('Your final score')).toBeInTheDocument()
        expect(screen.getByText('190.00')).toBeInTheDocument()
    })
    it('shows immutable final balances and budget values',async()=>{
        renderRoute()
        expect(await screen.findByText('Final balances')).toBeInTheDocument()
        expect(screen.getByText('Your remaining budget')).toBeInTheDocument()
        expect(screen.getByText('46.67%')).toBeInTheDocument()
        expect(screen.getByText('1.20×')).toBeInTheDocument()
        expect(screen.getByText('40.00 points')).toBeInTheDocument()
    })
    it('renders obligation and event outcomes supplied by the API',async()=>{
        renderRoute()
        await screen.findByText('Month complete!')
        const obligationSection=screen.getByText('Obligation outcomes').parentElement!
        const eventSection=screen.getByText('Surprise event outcomes').parentElement!
        expect(within(obligationSection).getByText('Paid on time')).toBeInTheDocument()
        expect(within(obligationSection).getByText('Paid late')).toBeInTheDocument()
        expect(within(obligationSection).getByText('Missed')).toBeInTheDocument()
        expect(within(eventSection).getByText('Resolved')).toBeInTheDocument()
        expect(within(eventSection).getByText('Timed out')).toBeInTheDocument()
    })
    it('shows the fixed 15 XP reward without inventing a coin reward',async()=>{
        renderRoute()
        expect(await screen.findByText('15 XP awarded')).toBeInTheDocument()
        expect(screen.queryByText(/coins awarded/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/\+\d+ coins/i)).not.toBeInTheDocument()
    })
    it('refetches the gamification profile to confirm the first completion badge',async()=>{
        mockedGetGamificationProfile.mockResolvedValue({
            data:{
                coins:0,
                xp:15,
                mascotLevel:1,
                mascotMood:'NEUTRAL',
                paymentStreak:0,
                longestStreak:0,
                knowledgeStreak:0,
                longestKnowledgeStreak:0,
                badges:[{
                    badgeKey:'FIRST_SIMULATION_COMPLETE',
                    name:'First Simulation Complete',
                    description:'Completed a simulated month.',
                    category:'SIMULATION',
                    iconKey:null,
                    earnedAt:'2026-09-21T12:10:00.000Z'
                }]
            }
        })
        renderRoute()
        expect(await screen.findByText('First month completed!')).toBeInTheDocument()
        expect(mockedGetGamificationProfile).toHaveBeenCalled()
    })
    it('does not claim the first completion badge when the profile lacks it',async()=>{
        renderRoute()
        await screen.findByText('Month complete!')
        await waitFor(()=>{
            expect(mockedGetGamificationProfile).toHaveBeenCalled()
        })
        expect(screen.queryByText('First month completed!')).not.toBeInTheDocument()
    })
    it('does not invent a badge when the profile request fails',async()=>{
        mockedGetGamificationProfile.mockRejectedValue(new Error('Profile unavailable'))
        renderRoute()
        expect(await screen.findByText('Your completion badge could not be checked.')).toBeInTheDocument()
        expect(screen.queryByText('First month completed!')).not.toBeInTheDocument()
    })
    it('redirects an active simulation to the board',async()=>{
        mockedGetSimulation.mockResolvedValue(activeBoardFixture)
        renderRoute()
        expect(await screen.findByText('Board handoff')).toBeInTheDocument()
        expect(mockedGetGamificationProfile).not.toHaveBeenCalled()
    })
    it('returns to simulation entry when Play again is selected',async()=>{
        renderRoute()
        fireEvent.click(await screen.findByRole('button',{name:/play again/i}))
        expect(await screen.findByText('Simulation entry handoff')).toBeInTheDocument()
    })
    it('returns to the dashboard without changing the completed simulation',async()=>{
        renderRoute()
        fireEvent.click(await screen.findByRole('button',{name:/return to dashboard/i}))
        expect(await screen.findByText('Dashboard handoff')).toBeInTheDocument()
        expect(mockedGetSimulation).toHaveBeenCalledTimes(1)
    })
    it('opens the score breakdown route without a simulation mutation',async()=>{
        renderRoute()
        fireEvent.click(await screen.findByRole('button',{name:/review score breakdown/i}))
        expect(await screen.findByText('Score breakdown handoff')).toBeInTheDocument()
        expect(mockedGetSimulation).toHaveBeenCalledTimes(1)
    })
    it('shows a retry action when the completed session cannot be loaded',async()=>{
        mockedGetSimulation
            .mockRejectedValueOnce(new Error('Summary unavailable'))
            .mockResolvedValueOnce(completedFixture)
        renderRoute()
        expect(await screen.findByText('Summary unavailable')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button',{name:/please try again/i}))
        expect(await screen.findByText('Month complete!')).toBeInTheDocument()
    })
})