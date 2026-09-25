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
            <div data-tour="dashboard.score">score</div>
            <Link to="/friends">Friends</Link>
            <Link to="/calendar">Calendar</Link>
        </>
    )
}

const path=()=>screen.getByTestId('path')
const highlight=()=>document.querySelector('[data-tour-highlight]')

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

    it('walks every stop of every page, moving the user itself',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))

        for(const [stepIndex,step] of WALKTHROUGH_STEPS.entries()){
            for(const [stopIndex,stop] of step.stops.entries()){
                const dialog=await screen.findByRole('dialog')
                expect(dialog).toHaveTextContent(stop.title)
                expect(dialog).toHaveTextContent(`step ${stepIndex+1} of 5`)
                expect(path()).toHaveTextContent(new RegExp(`^${step.route}$`))
                expect(within(dialog).getByRole('img',{name:/Mascot/})).toBeInTheDocument()

                const isFinalStop=stepIndex===WALKTHROUGH_STEPS.length-1
                    &&stopIndex===step.stops.length-1
                expect(screen.getByRole('button',{name:isFinalStop? 'Finish' : 'Next'})).toBeInTheDocument()
                if(!isFinalStop) await userEvent.click(screen.getByRole('button',{name:'Next'}))
            }
        }
    })

    it('rings the part of the page a stop explains, and copes when it is missing',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))

        expect(highlight()).toBeNull()

        await userEvent.click(screen.getByRole('button',{name:'Next'}))
        await waitFor(()=>expect(
            document.querySelector('[data-tour-highlight="dashboard.score"]'),
        ).not.toBeNull())

        await userEvent.click(screen.getByRole('button',{name:'Next'}))
        await waitFor(()=>expect(highlight()).toBeNull())
        expect(await screen.findByText(WALKTHROUGH_STEPS[0].stops[2].title)).toBeInTheDocument()
    })

    it('walks Back through the stops, then to the previous page',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:2}}),
        })
        renderWithGuidance(<Shell/>,{api,route:'/calendar/scheduled'})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        expect(await screen.findByText(WALKTHROUGH_STEPS[2].stops[0].title)).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button',{name:'Back'}))

        const previous=WALKTHROUGH_STEPS[1]
        expect(await screen.findByText(previous.stops[previous.stops.length-1].title)).toBeInTheDocument()
        expect(path()).toHaveTextContent(/^\/calendar$/)
    })

    it('disables Back only on the very first stop',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))
        expect(screen.getByRole('button',{name:'Back'})).toBeDisabled()

        await userEvent.click(screen.getByRole('button',{name:'Next'}))
        expect(screen.getByRole('button',{name:'Back'})).toBeEnabled()

        await userEvent.click(screen.getByRole('button',{name:'Back'}))
        expect(await screen.findByText(WALKTHROUGH_STEPS[0].stops[0].title)).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Back'})).toBeDisabled()
    })

    it('jumps straight to any step within a feature',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))
        const stops=WALKTHROUGH_STEPS[0].stops
        const last=stops[stops.length-1]

        await userEvent.click(screen.getByRole('button',{name:`Go to step ${stops.length}: ${last.title}`}))

        expect(await screen.findByText(last.title)).toBeInTheDocument()
        expect(screen.getByRole('button',{name:`Go to step ${stops.length}: ${last.title}`}))
            .toHaveAttribute('aria-current','step')
        expect(path()).toHaveTextContent('/domains/dashboard')
    })

    it('skips the rest of a feature to the start of the next one',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))
        await userEvent.click(screen.getByRole('button',{name:'Next'}))
        await userEvent.click(screen.getByRole('button',{name:`Skip ${WALKTHROUGH_STEPS[0].screen}`}))

        const dialog=await screen.findByRole('dialog')
        expect(dialog).toHaveTextContent(WALKTHROUGH_STEPS[1].stops[0].title)
        expect(dialog).toHaveTextContent('step 2 of 5')
        expect(path()).toHaveTextContent(new RegExp(`^${WALKTHROUGH_STEPS[1].route}$`))
        await waitFor(()=>expect(api.calls).toContainEqual({
            walkthrough:{status:'IN_PROGRESS',currentStep:1},
        }))
    })

    it('finishes the tour when the last feature is skipped',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:4}}),
        })
        const last=WALKTHROUGH_STEPS[WALKTHROUGH_STEPS.length-1]
        renderWithGuidance(<Shell/>,{api,route:last.route})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        await userEvent.click(await screen.findByRole('button',{name:`Skip ${last.screen}`}))

        await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
        await waitFor(()=>expect(api.calls).toContainEqual({
            walkthrough:{status:'COMPLETED',currentStep:4},
        }))
        expect(path()).toHaveTextContent('/domains/dashboard')
    })

    it('resumes on the saved step page, wherever the user starts from',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:3}}),
        })
        renderWithGuidance(<Shell/>,{api})

        expect(await screen.findByText(/You stopped at step 4 of 5/)).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button',{name:'Resume the tour'}))

        expect(await screen.findByText(WALKTHROUGH_STEPS[3].stops[0].title)).toBeInTheDocument()
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

        await userEvent.click(await screen.findByRole('button',{name:'Start the tour'}))

        expect(await screen.findByText(WALKTHROUGH_STEPS[0].stops[0].title)).toBeInTheDocument()
        expect(path()).toHaveTextContent('/domains/dashboard')
        await waitFor(()=>expect(api.calls).toContainEqual({replayWalkthrough:true}))
    })

    it('follows the user to a page that is part of the tour',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))
        expect(await screen.findByText(WALKTHROUGH_STEPS[0].stops[0].title)).toBeInTheDocument()

        await userEvent.click(screen.getByRole('link',{name:'Calendar'}))

        expect(await screen.findByText(WALKTHROUGH_STEPS[1].stops[0].title)).toBeInTheDocument()
        expect(path()).toHaveTextContent(/^\/calendar$/)
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        await waitFor(()=>expect(api.calls).toContainEqual({
            walkthrough:{status:'IN_PROGRESS',currentStep:1},
        }))
    })

    it('keeps running on a page the tour does not cover',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))
        await userEvent.click(screen.getByRole('link',{name:'Friends'}))

        expect(path()).toHaveTextContent('/friends')
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(WALKTHROUGH_STEPS[0].stops[0].title)).toBeInTheDocument()
        expect(screen.queryByText(/You stopped at step/)).toBeNull()
    })

    it('finishes by returning the user to the dashboard, without saving a sixth step',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:4}}),
        })
        renderWithGuidance(<Shell/>,{api,route:'/insights'})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        while(screen.queryByRole('button',{name:'Finish'})===null){
            await userEvent.click(screen.getByRole('button',{name:'Next'}))
        }
        await userEvent.click(screen.getByRole('button',{name:'Finish'}))

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

    it('leaves a skipped tour where the user stopped',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:3}}),
        })
        renderWithGuidance(<Shell/>,{api,route:'/quiz'})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        await userEvent.click(await screen.findByRole('button',{name:'End tour'}))

        await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
        expect(path()).toHaveTextContent(/^\/quiz$/)
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