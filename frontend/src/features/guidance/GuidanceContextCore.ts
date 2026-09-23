import * as React from 'react'
import type {GuidanceApi} from './guidanceApi'
import type {
    GuidanceState,
    GuidanceSurface,
    GuideFacts,
    SelectedGuide,
} from './guidanceTypes'

export type GuidanceLoadStatus='loading'|'ready'|'error'

export interface EvaluateOptions{
    manual?:boolean
}

export interface GuidanceContextValue{
    api:GuidanceApi
    userId:string|null
    state:GuidanceState
    status:GuidanceLoadStatus
    unsynced:boolean
    localDate:string
    blocked:boolean
    walkthroughVisible:boolean
    walkthroughStop:number
    dailyRefreshToken:number
    storage?:Storage|null

    reload:()=>void
    retrySync:()=>void
    requestDailyRefresh:()=>void

    evaluate:(surface:GuidanceSurface,facts:GuideFacts,options?:EvaluateOptions)=>SelectedGuide|null
    markShown:(id:string)=>void
    dismiss:(id:string)=>void

    setTipsEnabled:(enabled:boolean)=>void
    setDailyExpansionEnabled:(enabled:boolean)=>void
    resetDismissedTips:()=>void

    setBlocked:(key:string,blocked:boolean)=>void

    startWalkthrough:()=>void
    resumeWalkthrough:()=>void
    replayWalkthrough:()=>void
    goToWalkthroughStep:(step:number)=>void
    nextWalkthroughStop:()=>void
    previousWalkthroughStop:()=>void
    suspendWalkthrough:()=>void
    skipWalkthrough:()=>void
    completeWalkthrough:()=>void
}

export const GuidanceContext=React.createContext<GuidanceContextValue|null>(null)