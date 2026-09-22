export type GuidanceSurface=
    | 'dashboard'
    | 'calendar'
    | 'payment'
    | 'quiz'
    | 'insights'
    | 'walkthrough'

export type WalkthroughStatus='NOT_STARTED'|'IN_PROGRESS'|'COMPLETED'|'SKIPPED'

export const WALKTHROUGH_STEP_COUNT=5
export const WALKTHROUGH_MAX_STEP=WALKTHROUGH_STEP_COUNT-1

export const DISMISSED_TIP_LIMIT=30

export interface WalkthroughState{
    status:WalkthroughStatus
    currentStep:number
}

export interface GuidanceState{
    tipsEnabled:boolean
    dailyExpansionEnabled:boolean
    walkthrough:WalkthroughState
    dismissedTipIds:string[]
    updatedAt:string|null
}

export interface GuidanceStatePatch{
    tipsEnabled?:boolean
    dailyExpansionEnabled?:boolean
    walkthrough?:WalkthroughState
    dismissTipId?:string
    resetDismissedTips?:boolean
    replayWalkthrough?:boolean
}

export type DailyQuizStatus='AVAILABLE'|'IN_PROGRESS'|'COMPLETED'|'UNAVAILABLE'

export interface CurrencyTotal{
    currency:string
    amount:string
}

export interface GuidanceDaily{
    localDate:string
    asOf:string
    payments:{
        contributionCount:number
        completedOccurrenceCount:number
        totalsByCurrency:CurrencyTotal[]
    }
    dailyQuiz:{
        status:DailyQuizStatus
        sessionId:string|null
        canStart:boolean
        canResume:boolean
    }
    streaks:{
        payment:number
        knowledge:number
    }
}

export type GuideKind='walkthrough'|'result'|'urgent'|'ordinary'

export type GuideFacts=Record<string,unknown>

export interface GuideAction{
    label:string
    to?:string
    intent?:'retry'
}

export interface GuideCandidate{
    id:string
    surface:GuidanceSurface
    kind:GuideKind
    priority:number
    dismissible:boolean
    text:string
    placeholders?:readonly string[]
    actions?:readonly GuideAction[]
    cooldownMs?:number
    eligible:(facts:GuideFacts)=>boolean
}

export interface SelectedGuide{
    id:string
    surface:GuidanceSurface
    kind:GuideKind
    text:string
    dismissible:boolean
    actions:readonly GuideAction[]
}

export interface GuidanceUiState{
    route:string
    localDate:string
    blocked:boolean
    tipsEnabled:boolean
    dismissedTipIds:readonly string[]
    walkthroughActive:boolean
    shownAt?:ReadonlyMap<string,number>
    now?:number
    manual?:boolean
}