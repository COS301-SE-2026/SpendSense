import React from 'react'
import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter,Route,Routes,useLocation} from 'react-router-dom'
import {describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import OnboardingPage from '../domains/OnboardingPage'
import {GuidanceProvider} from '../features/guidance/GuidanceProvider'
import {GuidanceWalkthrough} from '../components/guidance/GuidanceWalkthrough'
import {WALKTHROUGH_STEPS} from '../features/guidance/guidanceCatalogue'
import {createFakeGuidanceApi,makeGuidanceState} from './guidanceTestUtils'

vi.mock('@/features/reminders/remindersApi',()=>({
    getReminderPreferences:vi.fn(async()=>({defaultReminderDaysBefore:3,inAppEnabled:true})),
    updateReminderPreferences:vi.fn(async()=>undefined),
}))

vi.mock('@/features/users/usersApi',()=>({
    updateMe:vi.fn(async()=>undefined),
}))

vi.mock('@/hooks/useGamificationProfile',()=>({
    useGamificationProfile:()=>({
        profile:{mascotMood:'HAPPY',equippedCosmetics:[]},
        loading:false,
        error:null,
        refetch:vi.fn(),
    }),
}))

function Path(){
    return <p data-testid="path">{useLocation().pathname}</p>
}

function renderOnboarding(api:ReturnType<typeof createFakeGuidanceApi>){
    render(
        <MemoryRouter initialEntries={['/onboarding']}>
            <GuidanceProvider api={api} userId="user-1">
                <Path/>
                <GuidanceWalkthrough/>
                <Routes>
                    <Route path="/onboarding" element={<OnboardingPage/>}/>
                    <Route path="/domains/dashboard" element={<p>Dashboard</p>}/>
                </Routes>
            </GuidanceProvider>
        </MemoryRouter>,
    )
}

describe('onboarding hands over to the guided tour',()=>{
    it('starts the tour on the dashboard when onboarding is completed',async()=>{
        const api=createFakeGuidanceApi()
        renderOnboarding(api)

        await userEvent.click(await screen.findByRole('button',{name:/continue/i}))

        expect(await screen.findByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(WALKTHROUGH_STEPS[0].stops[0].title)).toBeInTheDocument()
        expect(screen.getByTestId('path')).toHaveTextContent('/domains/dashboard')
        await waitFor(()=>expect(api.calls).toContainEqual({
            walkthrough:{status:'IN_PROGRESS',currentStep:0},
        }))
    })

    it('starts the tour when onboarding is skipped too',async()=>{
        const api=createFakeGuidanceApi()
        renderOnboarding(api)

        await userEvent.click(await screen.findByRole('button',{name:'Skip'}))

        expect(await screen.findByRole('dialog')).toBeInTheDocument()
        expect(screen.getByTestId('path')).toHaveTextContent('/domains/dashboard')
    })

    it('does not restart a tour the user already finished',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'COMPLETED',currentStep:4}}),
        })
        renderOnboarding(api)

        await waitFor(()=>expect(api.getState).toHaveBeenCalled())
        await userEvent.click(screen.getByRole('button',{name:'Skip'}))

        expect(screen.getByTestId('path')).toHaveTextContent('/domains/dashboard')
        expect(screen.queryByRole('dialog')).toBeNull()
    })
})