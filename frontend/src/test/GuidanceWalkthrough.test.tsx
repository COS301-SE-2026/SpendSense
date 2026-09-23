import React from 'react'
import {screen,waitFor,within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Link,useLocation} from 'react-router-dom'
import {describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import {GuidanceTourInvitation,GuidanceWalkthrough} from '../components/guidance/GuidanceWalkthrough'
import {GuidanceSettings} from '../components/guidance/GuidanceSettings'
import {WALKTHROUGH_STEPS} from '../features/guidance/guidanceCatalogue'
import {createFakeGuidanceApi,makeGuidanceState,renderWithGuidance} from './guidanceTestUtils'

vi.mock('@/hooks/useGamificationProfile',()=>({
    useGamificationProfile:()=>({
        profile:{mascotMood:'HAPPY',equippedCosmetics:[]},
        loading:false,
        error:null,
        refetch:vi.fn(),
    }),
}))

function Shell(){
    const location=useLocation()
    return(
        <>
            <p data-testid="path">{location.pathname}</p>
            <GuidanceTourInvitation/>
            <GuidanceWalkthrough/>
            <Link to="/friends">Friends</Link>
        </>
    )
}

const path=()=>screen.getByTestId('path')

describe('GuidanceWalkthrough',()=>{
    it('invites a new user and can be declined without blocking the app',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await screen.findByText('Want a quick tour?')
        await userEvent.click(screen.getByRole('button',{name:'Not now'}))

        await waitFor(()=>expect(api.calls).toContainEqual({
            walkthrough:{status:'SKIPPED',currentStep:0},
        }))
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(path()).toHaveTextContent('/domains/dashboard')
    })

    it('takes the user through every stop of each step page on Next without pausing',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))

        for(const [stepIndex,step] of WALKTHROUGH_STEPS.entries()){
            expect(path()).toHaveTextContent(new RegExp(`^${step.route}$`))
            for(const [stopIndex,stop] of step.stops.entries()){
                expect(await screen.findByText(new RegExp(`${step.screen} . step ${stepIndex+1} of 5`))).toBeInTheDocument()
                expect(screen.getByRole('heading',{name:stop.title})).toBeInTheDocument()
                const dialog=screen.getByRole('dialog')
                expect(within(dialog).getByRole('img',{name:/Mascot/})).toBeInTheDocument()

                const isVeryLast=stepIndex===WALKTHROUGH_STEPS.length-1&&stopIndex===step.stops.length-1
                await userEvent.click(screen.getByRole('button',{name:isVeryLast? 'Finish' : 'Next'}))
            }
        }

        expect(screen.queryByRole('dialog')).toBeNull()
        expect(path()).toHaveTextContent('/domains/dashboard')
    })

    it('takes the user back a page on Back',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:2}}),
        })
        renderWithGuidance(<Shell/>,{api,route:'/calendar/scheduled'})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        await userEvent.click(await screen.findByRole('button',{name:'Back'}))

        expect(await screen.findByText(/Calendar . step 2 of 5/)).toBeInTheDocument()
        const calendarStops=WALKTHROUGH_STEPS[1].stops
        expect(screen.getByRole('heading',{name:calendarStops[calendarStops.length-1].title})).toBeInTheDocument()
        expect(path()).toHaveTextContent(/^\/calendar$/)
        expect(screen.getByRole('button',{name:'Back'})).toBeEnabled()
    })

    it('resumes on the saved step page, wherever the user starts from',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:3}}),
        })
        renderWithGuidance(<Shell/>,{api})

        expect(await screen.findByText(/You stopped at step 4 of 5/)).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button',{name:'Resume the tour'}))

        expect(await screen.findByText(/Daily quiz . step 4 of 5/)).toBeInTheDocument()
        expect(screen.getByRole('heading',{name:WALKTHROUGH_STEPS[3].stops[0].title})).toBeInTheDocument()
        expect(path()).toHaveTextContent(/^\/quiz$/)
    })

    it('replays from settings by taking the user back to the dashboard',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'COMPLETED',currentStep:4}}),
        })
        renderWithGuidance(
            <>
                <Shell/>
                <GuidanceSettings/>
            </>,
            {api,route:'/help'},
        )

        await userEvent.click(await screen.findByRole('button',{name:'Replay the tour'}))

        expect(await screen.findByText(/Dashboard . step 1 of 5/)).toBeInTheDocument()
        expect(screen.getByRole('heading',{name:WALKTHROUGH_STEPS[0].stops[0].title})).toBeInTheDocument()
        expect(path()).toHaveTextContent('/domains/dashboard')
        await waitFor(()=>expect(api.calls).toContainEqual({replayWalkthrough:true}))
    })

    it('pauses, keeping the step, when the user leaves the tour page themselves',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))
        const dashboardStopCount=WALKTHROUGH_STEPS[0].stops.length
        for(let i=0;i<dashboardStopCount;i++){
            await userEvent.click(screen.getByRole('button',{name:'Next'}))
        }
        expect(await screen.findByText(/Calendar . step 2 of 5/)).toBeInTheDocument()

        await userEvent.click(screen.getByRole('link',{name:'Friends'}))

        await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
        expect(path()).toHaveTextContent('/friends')
        expect(screen.getByText(/You stopped at step 2 of 5/)).toBeInTheDocument()
    })

    it('leaves a skipped tour where the user stopped',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:3}}),
        })
        renderWithGuidance(<Shell/>,{api,route:'/quiz'})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        await userEvent.click(await screen.findByRole('button',{name:'Skip'}))

        await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
        expect(path()).toHaveTextContent(/^\/quiz$/)
    })

    it('finishes by returning the user to the dashboard, without saving a sixth step',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:4}}),
        })
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        const lastStepStopCount=WALKTHROUGH_STEPS[WALKTHROUGH_STEPS.length-1].stops.length
        for(let i=0;i<lastStepStopCount-1;i++){
            await userEvent.click(screen.getByRole('button',{name:'Next'}))
        }
        await userEvent.click(await screen.findByRole('button',{name:'Finish'}))

        await waitFor(()=>expect(api.calls).toContainEqual({
            walkthrough:{status:'COMPLETED',currentStep:4},
        }))
        const steps=api.calls
            .map((call)=>call.walkthrough)
            .filter((walkthrough)=>walkthrough!==undefined)
            .map((walkthrough)=>walkthrough.currentStep)
        expect(Math.max(...steps)).toBeLessThanOrEqual(4)
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(path()).toHaveTextContent('/domains/dashboard')
    })

    it('closes from the keyboard with Escape',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:1}}),
        })
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        const dialog=await screen.findByRole('dialog')
        expect(dialog).toHaveFocus()

        await userEvent.keyboard('{Escape}')

        await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
        expect(api.calls).toContainEqual({walkthrough:{status:'SKIPPED',currentStep:1}})
    })

    it('shows only one panel even when a page also renders the invitation',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(
            <>
                <Shell/>
                <GuidanceTourInvitation/>
            </>,
            {api},
        )

        const [start]=await screen.findAllByRole('button',{name:'Take the tour'})
        await userEvent.click(start)

        expect(await screen.findAllByRole('dialog')).toHaveLength(1)
        expect(screen.queryByText('Want a quick tour?')).toBeNull()
    })

    it('keeps a completed tour out of the way',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'COMPLETED',currentStep:4}}),
        })
        renderWithGuidance(<Shell/>,{api})

        await waitFor(()=>expect(api.getState).toHaveBeenCalled())
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(screen.queryByText(/tour/i)).toBeNull()
    })
})