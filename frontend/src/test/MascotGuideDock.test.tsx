import React from 'react'
import {act,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import {MascotGuideDock,RETURN_TAB_TIMEOUT_MS} from '../components/guidance/MascotGuideDock'
import {johannesburgDate} from '../features/guidance/guidanceLocalDay'
import {
    createFakeGuidanceApi,
    createFakeStorage,
    makeDaily,
    makeGuidanceState,
    renderWithGuidance,
} from './guidanceTestUtils'

vi.mock('@/hooks/useGamificationProfile',()=>({
    useGamificationProfile:()=>({
        profile:{mascotMood:'HAPPY',equippedCosmetics:[]},
        loading:false,
        error:null,
        refetch:vi.fn(),
    }),
}))

const hideButton=()=>screen.getByRole('button',{name:'Hide your mascot guide'})
const returnTab=()=>screen.getByRole('button',{name:'Bring your mascot guide back'})

describe('MascotGuideDock',()=>{
    it('opens its bubble on its own once a day and not again',async()=>{
        const storage=createFakeStorage()
        const api=createFakeGuidanceApi({daily:makeDaily()})

        const view=renderWithGuidance(<MascotGuideDock/>,{api,storage})
        await waitFor(()=>expect(screen.getByText(/Nothing has been recorded today yet/)).toBeInTheDocument())

        view.unmount()
        renderWithGuidance(<MascotGuideDock/>,{api,storage})

        await waitFor(()=>expect(hideButton()).toBeInTheDocument())
        expect(screen.queryByText(/Nothing has been recorded today yet/)).toBeNull()
        expect(storage.getItem(`guidance:auto-expanded:user-1:${johannesburgDate()}`)).toBe('1')
    })

    it('speaks in a bubble beside the mascot',async()=>{
        const api=createFakeGuidanceApi({
            daily:makeDaily({
                payments:{
                    contributionCount:2,
                    completedOccurrenceCount:1,
                    totalsByCurrency:[{currency:'ZAR',amount:'280.00'}],
                },
                dailyQuiz:{status:'COMPLETED',sessionId:'quiz_123',canStart:false,canResume:false},
            }),
        })

        renderWithGuidance(<MascotGuideDock/>,{api,storage:createFakeStorage()})

        const bubble=await screen.findByRole('status')
        expect(bubble).toHaveAttribute('data-guide-variant','bubble')
        expect(bubble).toHaveTextContent(/You recorded R280\.00 today and completed your daily quiz/)
        expect(hideButton()).toBeInTheDocument()
    })

    it('leaves the screen when the mascot is clicked, and comes back from the edge tab',async()=>{
        const api=createFakeGuidanceApi({daily:makeDaily()})
        renderWithGuidance(<MascotGuideDock/>,{api,storage:createFakeStorage()})

        await waitFor(()=>expect(screen.getByText(/Nothing has been recorded today yet/)).toBeInTheDocument())

        await userEvent.click(hideButton())

        expect(screen.queryByRole('button',{name:'Hide your mascot guide'})).toBeNull()
        expect(screen.queryByText(/Nothing has been recorded today yet/)).toBeNull()
        expect(returnTab()).toBeInTheDocument()

        await userEvent.click(returnTab())

        expect(hideButton()).toBeInTheDocument()
        expect(await screen.findByText(/Nothing has been recorded today yet/)).toBeInTheDocument()
    })

    it('leaves the edge tab for ten seconds, then lets him go',async()=>{
        vi.useFakeTimers({shouldAdvanceTime:true})
        const user=userEvent.setup({advanceTimers:vi.advanceTimersByTime})
        try{
            const api=createFakeGuidanceApi({daily:makeDaily()})
            renderWithGuidance(<MascotGuideDock/>,{api,storage:createFakeStorage()})

            await waitFor(()=>expect(hideButton()).toBeInTheDocument())
            await user.click(hideButton())
            expect(returnTab()).toBeInTheDocument()

            await act(async()=>{
                vi.advanceTimersByTime(RETURN_TAB_TIMEOUT_MS-1000)
            })
            expect(returnTab()).toBeInTheDocument()

            await act(async()=>{
                vi.advanceTimersByTime(1000)
            })
            expect(screen.queryByRole('button',{name:'Bring your mascot guide back'})).toBeNull()
            expect(screen.queryByRole('button',{name:'Hide your mascot guide'})).toBeNull()
        }finally{
            vi.useRealTimers()
        }
    })

    it('brings the bubble back by hand even when automatic tips are off',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({tipsEnabled:false}),
            daily:makeDaily(),
        })
        renderWithGuidance(<MascotGuideDock/>,{api,storage:createFakeStorage()})

        await waitFor(()=>expect(hideButton()).toBeInTheDocument())
        expect(screen.queryByRole('status')).toBeNull()

        await userEvent.click(hideButton())
        await userEvent.click(returnTab())

        expect(await screen.findByText(/Nothing has been recorded today yet/)).toBeInTheDocument()
    })

    it('says the facts failed rather than reporting no activity',async()=>{
        const api=createFakeGuidanceApi({failDaily:true})
        renderWithGuidance(<MascotGuideDock/>,{api,storage:createFakeStorage()})

        await waitFor(()=>expect(screen.getByText(/could not refresh today/)).toBeInTheDocument())
        expect(screen.queryByText(/Nothing has been recorded today yet/)).toBeNull()

        await userEvent.click(screen.getByRole('button',{name:'Retry'}))
        await waitFor(()=>expect(api.getDaily).toHaveBeenCalledTimes(2))
    })
})