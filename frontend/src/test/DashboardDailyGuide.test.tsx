import React from 'react'
import {screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import {DashboardDailyGuide} from '../components/guidance/DashboardDailyGuide'
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

describe('DashboardDailyGuide',()=>{
    it('expands automatically once a day and not again',async()=>{
        const storage=createFakeStorage()
        const api=createFakeGuidanceApi({daily:makeDaily()})

        const view=renderWithGuidance(<DashboardDailyGuide/>,{api,storage})
        await waitFor(()=>expect(screen.getByText(/Nothing has been recorded today yet/)).toBeInTheDocument())

        view.unmount()
        renderWithGuidance(<DashboardDailyGuide/>,{api,storage})

        await waitFor(()=>expect(screen.getByRole('button',{name:/guide/i})).toHaveAttribute('aria-expanded','false'))
        expect(storage.getItem(`guidance:auto-expanded:user-1:${johannesburgDate()}`)).toBe('1')
    })

    it('shows recorded totals per currency without combining them',async()=>{
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

        renderWithGuidance(<DashboardDailyGuide/>,{api,storage:createFakeStorage()})

        await waitFor(()=>expect(
            screen.getByText(/You recorded R280\.00 today and completed your daily quiz/),
        ).toBeInTheDocument())
    })

    it('shows an unavailable card rather than reporting no activity',async()=>{
        const api=createFakeGuidanceApi({failDaily:true})
        renderWithGuidance(<DashboardDailyGuide/>,{api,storage:createFakeStorage()})

        await waitFor(()=>expect(screen.getByText(/could not refresh today/)).toBeInTheDocument())
        expect(screen.queryByText(/Nothing has been recorded today yet/)).toBeNull()
        expect(screen.getByRole('button',{name:'Retry'})).toBeInTheDocument()
    })

    it('retries the daily facts on demand',async()=>{
        const api=createFakeGuidanceApi({failDaily:true})
        renderWithGuidance(<DashboardDailyGuide/>,{api,storage:createFakeStorage()})

        await waitFor(()=>expect(screen.getByRole('button',{name:'Retry'})).toBeInTheDocument())
        await userEvent.click(screen.getByRole('button',{name:'Retry'}))

        await waitFor(()=>expect(api.getDaily).toHaveBeenCalledTimes(2))
    })

    it('stays manually openable when automatic tips are off',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({tipsEnabled:false}),
            daily:makeDaily(),
        })

        renderWithGuidance(<DashboardDailyGuide/>,{api,storage:createFakeStorage()})

        const toggle=await screen.findByRole('button',{name:/guide/i})
        expect(toggle).toHaveAttribute('aria-expanded','false')

        await userEvent.click(toggle)

        await waitFor(()=>expect(screen.getByText(/Nothing has been recorded today yet/)).toBeInTheDocument())
    })
})