import React from 'react'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import {SurpriseEventResultPage} from '../features/simulation/screens/SurpriseEventResultPage'
import {activeBoardFixture,eventResultFixture} from '../features/simulation/fixtures/SimulationDetail'
import {continueSimulation,getSimulation} from '../features/simulation/api'
import type {EventResolutionResult} from '../features/simulation/types'

vi.mock('../features/simulation/api',()=>({
    continueSimulation:vi.fn(),
    getSimulation:vi.fn()
}))

const mockedGetSimulation=vi.mocked(getSimulation)
const mockedContinue=vi.mocked(continueSimulation)

const resolvedEvent:EventResolutionResult={
    id:'event_fixture_1',
    optionId:'pay_now',
    label:'Pay for the repair now',
    explanation:'You paid for the repair using your fictional Current balance.',
    immediateCost:'600.00',
    feeOrDebt:'0.00',
    currentUsed:'600.00',
    savingsUsed:'0.00',
    uncoveredAmount:'0.00',
    pointsAwarded:'30.00',
    introducedObligationId:null
}

function renderRoute(eventResult?:EventResolutionResult){
    return render(
        <MemoryRouter initialEntries={[{
            pathname:'/simulation/session/sim_fixture_1/event-result',
            state:eventResult?{eventResult}:null
        }]}>
            <Routes>
                <Route
                    path="/simulation/session/:sessionId/event-result"
                    element={<SurpriseEventResultPage/>}
                />
                <Route
                    path="/simulation/session/:sessionId"
                    element={<p>Board handoff</p>}
                />
                <Route
                    path="/simulation/session/:sessionId/event"
                    element={<p>Event reveal handoff</p>}
                />
                <Route
                    path="/simulation/session/:sessionId/summary"
                    element={<p>Summary handoff</p>}
                />
                <Route
                    path="/simulation"
                    element={<p>Simulation entry</p>}
                />
            </Routes>
        </MemoryRouter>
    )
}

describe('Surprise event result',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        mockedGetSimulation.mockResolvedValue(eventResultFixture)
    })
    it('shows the chosen option and explanation after resolution',async()=>{
        renderRoute(resolvedEvent)
        expect(await screen.findByText('Pay for the repair now')).toBeInTheDocument()
        expect(screen.getByText(resolvedEvent.explanation)).toBeInTheDocument()
        expect(screen.getByText('Decision applied!')).toBeInTheDocument()
    })
    it('shows the returned financial effects and points',async()=>{
        renderRoute(resolvedEvent)
        expect(await screen.findByText('What changed?')).toBeInTheDocument()
        expect(screen.getByText('Immediate cost')).toBeInTheDocument()
        expect(screen.getByText('Paid from Current')).toBeInTheDocument()
        expect(screen.getByText('Paid from Savings')).toBeInTheDocument()
        expect(screen.getByText('Uncovered amount')).toBeInTheDocument()
        expect(screen.getAllByText('+30.00 points')).toHaveLength(2)
    })
    it('shows the server-provided balances',async()=>{
        renderRoute(resolvedEvent)
        expect(await screen.findByText('Your updated balances')).toBeInTheDocument()
        expect(screen.getByText('Current score')).toBeInTheDocument()
        expect(screen.getByText('+80.00 points')).toBeInTheDocument()
    })
    it('recovers after refresh without inventing the missing event explanation',async()=>{
        renderRoute()
        expect(await screen.findByText('Event result recorded')).toBeInTheDocument()
        expect(screen.queryByText(resolvedEvent.explanation)).not.toBeInTheDocument()
        expect(screen.getByText('Recent event activity')).toBeInTheDocument()
        expect(screen.getByRole('button',{name:/back to game/i})).toBeEnabled()
    })
    it('shows the timed-out acknowledgement from the server expiry entry',async()=>{
        mockedGetSimulation.mockResolvedValue({
            ...eventResultFixture,
            recentScoreEntries:[{
                id:'expiry_score',
                sourceType:'EVENT_EXPIRY',
                sourceId:'event_fixture_1',
                simulatedDay:12,
                pointsDelta:'-10.00',
                reason:'Event decision timed out',
                createdAt:'2026-09-21T12:02:30.000Z'
            }]
        })
        renderRoute()
        expect(await screen.findByText('Time ran out')).toBeInTheDocument()
        expect(screen.getByText('Event timed out')).toBeInTheDocument()
        expect(screen.getByText('-10.00 points')).toBeInTheDocument()
    })
    it('shows a newly introduced obligation from the returned simulation detail',async()=>{
        mockedGetSimulation.mockResolvedValue({
            ...eventResultFixture,
            obligations:[
                ...eventResultFixture.obligations,
                {
                    id:'new_obligation',
                    templateCode:'REPAIR_REPAYMENT',
                    name:'Repair repayment',
                    category:'Repayment',
                    amountDue:'650.00',
                    dueDay:20,
                    status:'SCHEDULED',
                    paidAt:null,
                    currentUsed:'0.00',
                    savingsUsed:'0.00',
                    pointsAwarded:'0.00'
                }
            ]
        })
        renderRoute({
            ...resolvedEvent,
            introducedObligationId:'new_obligation'
        })
        expect(await screen.findByText('New obligation')).toBeInTheDocument()
        expect(screen.getByText('Repair repayment')).toBeInTheDocument()
        expect(screen.getByText('Due on day 20')).toBeInTheDocument()
    })
    it('calls Continue and navigates using the returned server state',async()=>{
        mockedContinue.mockResolvedValue({
            ...activeBoardFixture,
            replayed:false
        })
        renderRoute(resolvedEvent)
        fireEvent.click(await screen.findByRole('button',{name:/back to game/i}))
        await waitFor(()=>{
            expect(mockedContinue).toHaveBeenCalledWith(
                'sim_fixture_1',
                expect.any(String)
            )
        })
        expect(await screen.findByText('Board handoff')).toBeInTheDocument()
    })
    it('does not submit Continue twice while a request is pending',async()=>{
        mockedContinue.mockImplementation(()=>new Promise(()=>undefined))
        renderRoute(resolvedEvent)
        const button=await screen.findByRole('button',{name:/back to game/i})
        fireEvent.click(button)
        fireEvent.click(button)
        expect(mockedContinue).toHaveBeenCalledTimes(1)
    })
    it('reuses the same idempotency key when retrying Continue',async()=>{
        mockedContinue
            .mockRejectedValueOnce(new Error('Network unavailable'))
            .mockResolvedValueOnce({
                ...activeBoardFixture,
                replayed:false
            })
        renderRoute(resolvedEvent)
        fireEvent.click(await screen.findByRole('button',{name:/back to game/i}))
        expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable')
        fireEvent.click(screen.getByRole('button',{name:/back to game/i}))
        await screen.findByText('Board handoff')
        expect(mockedContinue).toHaveBeenCalledTimes(2)
        expect(mockedContinue.mock.calls[0][1]).toBe(mockedContinue.mock.calls[1][1])
    })
    it('recovers when Continue succeeded but the response was lost',async()=>{
        mockedContinue.mockRejectedValue(new Error('Network unavailable'))
        mockedGetSimulation
            .mockResolvedValueOnce(eventResultFixture)
            .mockResolvedValueOnce(activeBoardFixture)
        renderRoute(resolvedEvent)
        fireEvent.click(await screen.findByRole('button',{name:/back to game/i}))
        expect(await screen.findByText('Board handoff')).toBeInTheDocument()
        expect(mockedContinue).toHaveBeenCalledTimes(1)
        expect(mockedGetSimulation).toHaveBeenCalledTimes(2)
    })
    it('redirects when the result hold has already been acknowledged',async()=>{
        mockedGetSimulation.mockResolvedValue(activeBoardFixture)
        renderRoute(resolvedEvent)
        expect(await screen.findByText('Board handoff')).toBeInTheDocument()
        expect(mockedContinue).not.toHaveBeenCalled()
    })
    it('shows a retry action when loading the result fails',async()=>{
        mockedGetSimulation
            .mockRejectedValueOnce(new Error('Result unavailable'))
            .mockResolvedValueOnce(eventResultFixture)
        renderRoute()
        expect(await screen.findByText('Result unavailable')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button',{name:/please try again/i}))
        expect(await screen.findByText('Event result recorded')).toBeInTheDocument()
    })
})