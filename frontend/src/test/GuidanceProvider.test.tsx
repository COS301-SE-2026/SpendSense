import React from 'react'
import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter} from 'react-router-dom'
import {describe,expect,it} from 'vitest'
import '@testing-library/jest-dom'
import {GuidanceProvider} from '../features/guidance/GuidanceProvider'
import {useGuidance,useGuidanceSuppression} from '../features/guidance/useGuidance'
import {createFakeGuidanceApi,makeGuidanceState,renderWithGuidance} from './guidanceTestUtils'

function Probe({blocking}:{blocking?:boolean}){
    const {
        state,
        status,
        unsynced,
        dismiss,
        setTipsEnabled,
        retrySync,
        evaluate,
    }=useGuidance()
    useGuidanceSuppression('test-form',blocking===true)

    const guide=evaluate('dashboard',{
        factsUnavailable:false,
        contributionCount:0,
        dailyQuizStatus:'AVAILABLE',
    })

    return(
        <div>
            <p data-testid="status">{status}</p>
            <p data-testid="tips">{String(state.tipsEnabled)}</p>
            <p data-testid="dismissed">{state.dismissedTipIds.join(',')}</p>
            <p data-testid="unsynced">{String(unsynced)}</p>
            <p data-testid="guide">{guide?.id??'none'}</p>
            <button onClick={()=>dismiss('dashboard.daily.nothing-recorded')}>dismiss</button>
            <button onClick={()=>dismiss('not.in.allowlist')}>dismiss-unknown</button>
            <button onClick={()=>setTipsEnabled(false)}>tips-off</button>
            <button onClick={retrySync}>retry</button>
        </div>
    )
}

describe('GuidanceProvider',()=>{
    it('loads persisted state',async()=>{
        const api=createFakeGuidanceApi({state:makeGuidanceState({tipsEnabled:false})})
        renderWithGuidance(<Probe/>,{api})

        await waitFor(()=>expect(screen.getByTestId('status')).toHaveTextContent('ready'))
        expect(screen.getByTestId('tips')).toHaveTextContent('false')
    })

    it('falls back to defaults when the state read fails',async()=>{
        const api=createFakeGuidanceApi({failState:true})
        renderWithGuidance(<Probe/>,{api})

        await waitFor(()=>expect(screen.getByTestId('status')).toHaveTextContent('error'))
        expect(screen.getByTestId('guide')).toHaveTextContent('dashboard.daily.nothing-recorded')
    })

    it('dismisses optimistically and persists the allowlisted id',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Probe/>,{api})
        await waitFor(()=>expect(screen.getByTestId('status')).toHaveTextContent('ready'))

        await userEvent.click(screen.getByText('dismiss'))

        expect(screen.getByTestId('guide')).toHaveTextContent('none')
        await waitFor(()=>expect(api.calls).toContainEqual({dismissTipId:'dashboard.daily.nothing-recorded'}))
    })

    it('refuses to send an id that is not on the allowlist',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Probe/>,{api})
        await waitFor(()=>expect(screen.getByTestId('status')).toHaveTextContent('ready'))

        await userEvent.click(screen.getByText('dismiss-unknown'))
        expect(api.calls).toHaveLength(0)
    })

    it('keeps local state and warns when a save fails, then retries',async()=>{
        const api=createFakeGuidanceApi({failPatch:true})
        renderWithGuidance(<Probe/>,{api})
        await waitFor(()=>expect(screen.getByTestId('status')).toHaveTextContent('ready'))

        await userEvent.click(screen.getByText('tips-off'))

        await waitFor(()=>expect(screen.getByTestId('unsynced')).toHaveTextContent('true'))
        expect(screen.getByTestId('tips')).toHaveTextContent('false')

        await userEvent.click(screen.getByText('retry'))
        await waitFor(()=>expect(api.calls).toHaveLength(2))
    })

    it('suppresses guidance while a form is open',async()=>{
        const api=createFakeGuidanceApi()
        renderWithGuidance(<Probe blocking/>,{api})
        await waitFor(()=>expect(screen.getByTestId('status')).toHaveTextContent('ready'))

        expect(screen.getByTestId('guide')).toHaveTextContent('none')
    })

    it('resets in-memory state when the account changes',async()=>{
        const first=createFakeGuidanceApi({
            state:makeGuidanceState({dismissedTipIds:['dashboard.daily.nothing-recorded']}),
        })
        const second=createFakeGuidanceApi({state:makeGuidanceState()})

        const view=render(
            <MemoryRouter>
                <GuidanceProvider api={first} userId="user-1">
                    <Probe/>
                </GuidanceProvider>
            </MemoryRouter>,
        )
        await waitFor(()=>expect(screen.getByTestId('dismissed')).toHaveTextContent('dashboard.daily.nothing-recorded'))

        view.rerender(
            <MemoryRouter>
                <GuidanceProvider api={second} userId="user-2">
                    <Probe/>
                </GuidanceProvider>
            </MemoryRouter>,
        )

        await waitFor(()=>expect(screen.getByTestId('dismissed')).toHaveTextContent(''))
    })
})