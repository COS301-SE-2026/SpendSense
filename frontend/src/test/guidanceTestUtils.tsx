import React from 'react'
import {render} from '@testing-library/react'
import type {ReactElement,ReactNode} from 'react'
import {MemoryRouter} from 'react-router-dom'
import {vi} from 'vitest'
import {DEFAULT_GUIDANCE_STATE} from '../features/guidance/guidanceApi'
import type {GuidanceApi} from '../features/guidance/guidanceApi'
import {GuidanceProvider} from '../features/guidance/GuidanceProvider'
import type {GuidanceDaily,GuidanceState,GuidanceStatePatch} from '../features/guidance/guidanceTypes'

export function makeGuidanceState(overrides:Partial<GuidanceState>={}):GuidanceState{
    return{
        ...DEFAULT_GUIDANCE_STATE,
        ...overrides,
        walkthrough:{...DEFAULT_GUIDANCE_STATE.walkthrough,...overrides.walkthrough},
        dismissedTipIds:overrides.dismissedTipIds??[],
    }
}

export function makeDaily(overrides:Partial<GuidanceDaily>={}):GuidanceDaily{
    return{
        localDate:overrides.localDate??'2026-09-10',
        asOf:overrides.asOf??'2026-09-10T11:20:00.000Z',
        payments:{
            contributionCount:0,
            completedOccurrenceCount:0,
            totalsByCurrency:[],
            ...overrides.payments,
        },
        dailyQuiz:{
            status:'AVAILABLE',
            sessionId:null,
            canStart:true,
            canResume:false,
            ...overrides.dailyQuiz,
        },
        streaks:{payment:0,knowledge:0,...overrides.streaks},
    }
}

export type FakeGuidanceApi=GuidanceApi&{current:GuidanceState;calls:GuidanceStatePatch[]}

export function createFakeGuidanceApi(options?:{
    state?:GuidanceState
    daily?:GuidanceDaily
    failState?:boolean
    failPatch?:boolean
    failDaily?:boolean
}):FakeGuidanceApi{
    const store={current:options?.state??makeGuidanceState(),calls:[] as GuidanceStatePatch[]}

    const api={
        getState:vi.fn(async()=>{
            if(options?.failState) throw new Error('state unavailable')
            return store.current
        }),
        patchState:vi.fn(async(patch:GuidanceStatePatch)=>{
            store.calls.push(patch)
            if(options?.failPatch) throw new Error('patch failed')
            const next={...store.current,walkthrough:{...store.current.walkthrough}}
            if(patch.tipsEnabled!==undefined) next.tipsEnabled=patch.tipsEnabled
            if(patch.dailyExpansionEnabled!==undefined) next.dailyExpansionEnabled=patch.dailyExpansionEnabled
            if(patch.walkthrough) next.walkthrough={...patch.walkthrough}
            if(patch.replayWalkthrough) next.walkthrough={status:'IN_PROGRESS',currentStep:0}
            if(patch.dismissTipId&&!next.dismissedTipIds.includes(patch.dismissTipId)){
                next.dismissedTipIds=[...next.dismissedTipIds,patch.dismissTipId]
            }
            if(patch.resetDismissedTips) next.dismissedTipIds=[]
            next.updatedAt='2026-09-10T10:00:00.000Z'
            store.current=next
            return next
        }),
        getDaily:vi.fn(async()=>{
            if(options?.failDaily) throw new Error('facts unavailable')
            return options?.daily??makeDaily()
        }),
    }

    return Object.assign(api,store) as FakeGuidanceApi
}

export function createFakeStorage(initial:Record<string,string>={}):Storage{
    const map=new Map<string,string>(Object.entries(initial))
    return{
        get length(){
            return map.size
        },
        key:(index:number)=>Array.from(map.keys())[index]??null,
        getItem:(key:string)=>(map.has(key)? map.get(key) as string : null),
        setItem:(key:string,value:string)=>{
            map.set(key,value)
        },
        removeItem:(key:string)=>{
            map.delete(key)
        },
        clear:()=>map.clear(),
    } as Storage
}

export function renderWithGuidance(ui:ReactElement,options:{
    api:GuidanceApi
    userId?:string|null
    storage?:Storage|null
    route?:string
}){
    const wrapper=({children}:{children:ReactNode})=>(
        <MemoryRouter initialEntries={[options.route??'/domains/dashboard']}>
            <GuidanceProvider
                api={options.api}
                userId={options.userId===undefined? 'user-1' : options.userId}
                storage={options.storage}
            >
                {children}
            </GuidanceProvider>
        </MemoryRouter>
    )
    return render(ui,{wrapper})
}