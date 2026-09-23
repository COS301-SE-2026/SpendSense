import React from 'react'
import {screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Link,useLocation} from 'react-router-dom'
import {describe,expect,it} from 'vitest'
import '@testing-library/jest-dom'
import {GuidanceTourInvitation,GuidanceWalkthrough} from '../components/guidance/GuidanceWalkthrough'
import {GuidanceSettings} from '../components/guidance/GuidanceSettings'
import {createFakeGuidanceApi,makeGuidanceState,renderWithGuidance} from './guidanceTestUtils'

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

    it('takes the user to each step page on Next without pausing',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))
        expect(await screen.findByText(/Step 1 of 5: Dashboard/)).toBeInTheDocument()
        expect(path()).toHaveTextContent('/domains/dashboard')

        const expected=[
            ['Step 2 of 5: Calendar','/calendar'],
            ['Step 3 of 5: Scheduled payments','/calendar/scheduled'],
            ['Step 4 of 5: Daily quiz','/quiz'],
            ['Step 5 of 5: Insights','/insights'],
        ]
        for(const [label,route] of expected){
            await userEvent.click(screen.getByRole('button',{name:'Next'}))
            expect(await screen.findByText(label)).toBeInTheDocument()
            expect(path()).toHaveTextContent(new RegExp(`^${route}$`))
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        }
    })

    it('takes the user back a page on Back',async()=>{
        const api=createFakeGuidanceApi({
            state:makeGuidanceState({walkthrough:{status:'IN_PROGRESS',currentStep:2}}),
        })
        renderWithGuidance(<Shell/>,{api,route:'/calendar/scheduled'})

        await userEvent.click(await screen.findByRole('button',{name:'Resume the tour'}))
        await userEvent.click(await screen.findByRole('button',{name:'Back'}))

        expect(await screen.findByText(/Step 2 of 5: Calendar/)).toBeInTheDocument()
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

        expect(await screen.findByText(/Step 4 of 5: Daily quiz/)).toBeInTheDocument()
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

        expect(await screen.findByText(/Step 1 of 5: Dashboard/)).toBeInTheDocument()
        expect(path()).toHaveTextContent('/domains/dashboard')
        await waitFor(()=>expect(api.calls).toContainEqual({replayWalkthrough:true}))
    })

    it('pauses, keeping the step, when the user leaves the tour page themselves',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Shell/>,{api})

        await userEvent.click(await screen.findByRole('button',{name:'Take the tour'}))
        await userEvent.click(await screen.findByRole('button',{name:'Next'}))
        expect(await screen.findByText(/Step 2 of 5/)).toBeInTheDocument()

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