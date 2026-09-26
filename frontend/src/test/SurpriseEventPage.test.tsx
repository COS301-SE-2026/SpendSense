import React from 'react'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import {SurpriseEventRevealPage,SurpriseEventDecisionPage} from '../features/simulation/screens/SurpriseEventPage'
import {eventRevealFixture,eventResultFixture,activeBoardFixture} from '../features/simulation/fixtures/SimulationDetail'
import {getSimulation,resolveSimulationEvent} from '../features/simulation/api'

vi.mock('../features/simulation/api',()=>({
    getSimulation:vi.fn(),
    resolveSimulationEvent:vi.fn()
}))

const mockedGetSimulation=vi.mocked(getSimulation)
const mockedResolveEvent=vi.mocked(resolveSimulationEvent)

const futureEvent={
    ...eventRevealFixture,
    currentEvent:{
        ...eventRevealFixture.currentEvent!,
        decisionExpiresAt:new Date(Date.now()+120_000).toISOString()
    }
}

const resultResponse={
    ...eventResultFixture,
    event:{
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
    },
    replayed:false
}

function renderRoute(initialEntry:string){
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route
                    path="/simulation/session/:sessionId/event"
                    element={<SurpriseEventRevealPage/>}
                />
                <Route
                    path="/simulation/session/:sessionId/event/decision"
                    element={<SurpriseEventDecisionPage/>}
                />
                <Route
                    path="/simulation/session/:sessionId/event-result"
                    element={<p>Event result handoff</p>}
                />
                <Route
                    path="/simulation/session/:sessionId/board"
                    element={<p>Board handoff</p>}
                />
                <Route
                    path="/simulation"
                    element={<p>Simulation entry</p>}
                />
            </Routes>
        </MemoryRouter>
    )
}

describe('Surprise event reveal and decision',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        mockedGetSimulation.mockResolvedValue(futureEvent)
    })
    it('displays only the currently revealed event',async()=>{
        renderRoute('/simulation/session/sim_fixture_1/event')
        expect(await screen.findByText('Unexpected repair')).toBeInTheDocument()
        expect(screen.getByText(futureEvent.currentEvent.context)).toBeInTheDocument()
        expect(screen.getByRole('button',{name:/see my options/i})).toBeInTheDocument()
        expect(screen.queryByRole('radio')).not.toBeInTheDocument()
        expect(mockedResolveEvent).not.toHaveBeenCalled()
    })
    it('opens the decision screen without mutating the simulation',async()=>{
        renderRoute('/simulation/session/sim_fixture_1/event')
        fireEvent.click(await screen.findByRole('button',{name:/see my options/i}))
        expect(await screen.findByRole('radio',{name:/pay for the repair now/i})).toBeInTheDocument()
        expect(mockedResolveEvent).not.toHaveBeenCalled()
    })
    it('renders options from the backend without exposing hidden score values',async()=>{
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        expect(await screen.findByText('Pay for the repair now')).toBeInTheDocument()
        expect(screen.getByText('Delay the repair')).toBeInTheDocument()
        expect(screen.getByText('Borrow to cover the repair')).toBeInTheDocument()
        expect(screen.queryByText('30.00 points')).not.toBeInTheDocument()
        expect(screen.getByRole('button',{name:/confirm choice/i})).toBeDisabled()
    })
    it('steps through the options with the arrow buttons',async()=>{
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        const previous=await screen.findByRole('button',{name:'Previous option'})
        const next=screen.getByRole('button',{name:'Next option'})
        expect(screen.getByText('Option 1 of 3')).toBeInTheDocument()
        expect(previous).toBeDisabled()
        fireEvent.click(next)
        fireEvent.click(next)
        expect(screen.getByText('Option 3 of 3')).toBeInTheDocument()
        expect(next).toBeDisabled()
        fireEvent.click(previous)
        expect(screen.getByText('Option 2 of 3')).toBeInTheDocument()
        expect(screen.getByRole('button',{name:/confirm choice/i})).toBeDisabled()
    })
    it('explains each option from the server amounts and blocks unaffordable choices',async()=>{
        mockedGetSimulation.mockResolvedValue({
            ...futureEvent,
            currentEvent:{
                ...futureEvent.currentEvent,
                options:futureEvent.currentEvent.options.map(option=>option.id==='pay_now'
                    ?{...option,affordable:false,shortfall:'150.00'}
                    :option)
            }
        })
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        const payNow=await screen.findByRole('radio',{name:/pay for the repair now/i})
        expect(payNow).toBeDisabled()
        expect(screen.getByRole('radio',{name:/pay for the repair now/i}).closest('label')).toHaveTextContent(/R\s150 short/)
        expect(screen.getByRole('radio',{name:/borrow to cover the repair/i}).closest('label')).toHaveTextContent(/R\s50 today \(R\s50 fee\).*One R\s600 bill due Day 25/)
        fireEvent.click(payNow)
        expect(screen.getByRole('button',{name:/confirm choice/i})).toBeDisabled()
    })
    it('uses the server event deadline in timed mode',async()=>{
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        await screen.findByText('Unexpected repair')
        await waitFor(()=>{
            expect(screen.getByLabelText('Time remaining')).toHaveTextContent(/^01:\d{2}$|^02:00$/)
        })
    })
    it('does not display a countdown in accessibility mode',async()=>{
        mockedGetSimulation.mockResolvedValue({
            ...futureEvent,
            session:{
                ...futureEvent.session,
                timedMode:false
            },
            currentEvent:{
                ...futureEvent.currentEvent,
                decisionExpiresAt:null
            }
        })
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        await screen.findByText('Unexpected repair')
        expect(screen.queryByLabelText('Time remaining')).not.toBeInTheDocument()
    })
    it('submits the selected server option and navigates to the result',async()=>{
        mockedResolveEvent.mockResolvedValue(resultResponse)
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        fireEvent.click(await screen.findByRole('radio',{name:/pay for the repair now/i}))
        fireEvent.click(screen.getByRole('button',{name:/confirm choice/i}))
        await waitFor(()=>{
            expect(mockedResolveEvent).toHaveBeenCalledWith(
                'sim_fixture_1',
                'event_fixture_1',
                'pay_now',
                expect.any(String)
            )
        })
        expect(await screen.findByText('Event result handoff')).toBeInTheDocument()
    })
    it('prevents duplicate submissions while the request is pending',async()=>{
        mockedResolveEvent.mockImplementation(()=>new Promise(()=>undefined))
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        fireEvent.click(await screen.findByRole('radio',{name:/pay for the repair now/i}))
        const confirm=screen.getByRole('button',{name:/confirm choice/i})
        fireEvent.click(confirm)
        fireEvent.click(confirm)
        expect(mockedResolveEvent).toHaveBeenCalledTimes(1)
    })
    it('reuses the idempotency key when retrying the same decision',async()=>{
        mockedResolveEvent
            .mockRejectedValueOnce(new Error('Network unavailable'))
            .mockResolvedValueOnce(resultResponse)
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        fireEvent.click(await screen.findByRole('radio',{name:/pay for the repair now/i}))
        fireEvent.click(screen.getByRole('button',{name:/confirm choice/i}))
        expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable')
        fireEvent.click(screen.getByRole('button',{name:/confirm choice/i}))
        await screen.findByText('Event result handoff')
        expect(mockedResolveEvent).toHaveBeenCalledTimes(2)
        expect(mockedResolveEvent.mock.calls[0][3]).toBe(mockedResolveEvent.mock.calls[1][3])
    })
    it('creates a new idempotency key when the selected option changes',async()=>{
        mockedResolveEvent.mockRejectedValue(new Error('Network unavailable'))
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        fireEvent.click(await screen.findByRole('radio',{name:/pay for the repair now/i}))
        fireEvent.click(screen.getByRole('button',{name:/confirm choice/i}))
        await screen.findByRole('alert')
        fireEvent.click(screen.getByRole('radio',{name:/delay the repair/i}))
        fireEvent.click(screen.getByRole('button',{name:/confirm choice/i}))
        await waitFor(()=>{
            expect(mockedResolveEvent).toHaveBeenCalledTimes(2)
        })
        expect(mockedResolveEvent.mock.calls[0][3]).not.toBe(mockedResolveEvent.mock.calls[1][3])
    })
    it('refetches authoritative state when the decision expires',async()=>{
        mockedResolveEvent.mockRejectedValue(new Error('EVENT_DECISION_EXPIRED'))
        mockedGetSimulation
            .mockResolvedValueOnce(futureEvent)
            .mockResolvedValueOnce(eventResultFixture)
        renderRoute('/simulation/session/sim_fixture_1/event/decision')
        fireEvent.click(await screen.findByRole('radio',{name:/pay for the repair now/i}))
        fireEvent.click(screen.getByRole('button',{name:/confirm choice/i}))
        expect(await screen.findByText('Event result handoff')).toBeInTheDocument()
        expect(mockedGetSimulation).toHaveBeenCalledTimes(2)
        expect(mockedResolveEvent).toHaveBeenCalledTimes(1)
    })
    it('redirects when the server no longer reports a revealed event',async()=>{
        mockedGetSimulation.mockResolvedValue(activeBoardFixture)
        renderRoute('/simulation/session/sim_fixture_1/event')
        expect(await screen.findByText('Board handoff')).toBeInTheDocument()
        expect(mockedResolveEvent).not.toHaveBeenCalled()
    })
    it('shows a retry action when loading the event fails',async()=>{
        mockedGetSimulation
            .mockRejectedValueOnce(new Error('Event unavailable'))
            .mockResolvedValueOnce(futureEvent)
        renderRoute('/simulation/session/sim_fixture_1/event')
        expect(await screen.findByText('Event unavailable')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button',{name:/please try again/i}))
        expect(await screen.findByText('Unexpected repair')).toBeInTheDocument()
    })
})