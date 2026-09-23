import * as React from 'react'
import {useLocation,useNavigate} from 'react-router-dom'
import {getCurrentSession} from '@/features/auth/auth.service'
import {DEFAULT_GUIDANCE_STATE,guidanceApi as defaultGuidanceApi} from './guidanceApi'
import type {GuidanceApi} from './guidanceApi'
import {GUIDANCE_CATALOGUE,GUIDANCE_ROUTES,isAllowlistedTipId,walkthroughRouteFor} from './guidanceCatalogue'
import {GuidanceContext} from './GuidanceContextCore'
import type {GuidanceContextValue,EvaluateOptions,GuidanceLoadStatus} from './GuidanceContextCore'
import {clearAutoExpandMarkers,johannesburgDate} from './guidanceLocalDay'
import {selectGuide} from './guidanceSelection'
import {DISMISSED_TIP_LIMIT,WALKTHROUGH_MAX_STEP} from './guidanceTypes'
import type {
    GuidanceState,
    GuidanceStatePatch,
    GuidanceSurface,
    GuideCandidate,
    GuideFacts,
} from './guidanceTypes'

export interface GuidanceProviderProps{
    children:React.ReactNode
    api?:GuidanceApi
    userId?:string|null
    catalogue?:readonly GuideCandidate[]
    storage?:Storage|null
}

export function GuidanceProvider({
    children,
    api=defaultGuidanceApi,
    userId:userIdProp,
    catalogue=GUIDANCE_CATALOGUE,
    storage,
}:GuidanceProviderProps){
    const location=useLocation()
    const navigate=useNavigate()
    const [sessionUserId,setSessionUserId]=React.useState<string|null>(null)
    const userId=userIdProp===undefined? sessionUserId : userIdProp

    const [state,setState]=React.useState<GuidanceState>(DEFAULT_GUIDANCE_STATE)
    const [loadStatus,setLoadStatus]=React.useState<GuidanceLoadStatus>('loading')
    const [unsynced,setUnsynced]=React.useState(false)
    const [localDate,setLocalDate]=React.useState(()=>johannesburgDate())
    const [blockedKeys,setBlockedKeys]=React.useState<readonly string[]>([])
    const [walkthroughVisible,setWalkthroughVisible]=React.useState(false)
    const [dailyRefreshToken,setDailyRefreshToken]=React.useState(0)
    const [reloadToken,setReloadToken]=React.useState(0)

    const pendingPatch=React.useRef<GuidanceStatePatch|null>(null)
    const shownAt=React.useRef(new Map<string,number>())
    const stateRef=React.useRef(state)
    const firstAccount=React.useRef(true)

    React.useEffect(()=>{
        stateRef.current=state
    },[state])

    const [lastUserId,setLastUserId]=React.useState<string|null|undefined>(undefined)
    if(lastUserId!==userId){
        setLastUserId(userId)
        if(lastUserId!==undefined){
            setState(DEFAULT_GUIDANCE_STATE)
            setUnsynced(false)
            setWalkthroughVisible(false)
            setLoadStatus('loading')
        }
    }

    React.useEffect(()=>{
        if(firstAccount.current){
            firstAccount.current=false
            return
        }
        shownAt.current.clear()
        pendingPatch.current=null
        clearAutoExpandMarkers(storage)
    },[userId,storage])

    React.useEffect(()=>{
        if(userIdProp!==undefined) return
        let active=true
        getCurrentSession()
            .then((session)=>{
                if(!active) return
                const id=(session as {user?:{id?:string}}|null)?.user?.id
                setSessionUserId(id??null)
            })
            .catch(()=>{
                if(active) setSessionUserId(null)
            })
        return ()=>{
            active=false
        }
    },[userIdProp])

    React.useEffect(()=>{
        if(!userId) return

        let active=true
        const controller=new AbortController()

        api.getState({signal:controller.signal})
            .then((next)=>{
                if(!active) return
                setState(next)
                setLoadStatus('ready')
            })
            .catch(()=>{
                if(!active) return
                // defaults keep guidance usable, the sync warning tells the user
                setState(DEFAULT_GUIDANCE_STATE)
                setLoadStatus('error')
            })

        return ()=>{
            active=false
            controller.abort()
        }
    },[api,userId,reloadToken])

    React.useEffect(()=>{
        const refresh=()=>setLocalDate(johannesburgDate())
        window.addEventListener('focus',refresh)
        return ()=>window.removeEventListener('focus',refresh)
    },[])

    const save=React.useCallback((
        patch:GuidanceStatePatch,
        optimistic:(prev:GuidanceState)=>GuidanceState,
    )=>{
        setState(optimistic)
        if(!userId) return
        api.patchState(patch)
            .then((canonical)=>{
                setState(canonical)
                pendingPatch.current=null
                setUnsynced(false)
            })
            .catch(()=>{
                pendingPatch.current=patch
                setUnsynced(true)
            })
    },[api,userId])

    const retrySync=React.useCallback(()=>{
        const patch=pendingPatch.current
        if(!patch||!userId) return
        api.patchState(patch)
            .then((canonical)=>{
                setState(canonical)
                pendingPatch.current=null
                setUnsynced(false)
            })
            .catch(()=>setUnsynced(true))
    },[api,userId])

    const setBlocked=React.useCallback((key:string,isBlocked:boolean)=>{
        setBlockedKeys((keys)=>{
            const has=keys.includes(key)
            if(isBlocked===has) return keys
            return isBlocked? [...keys,key] : keys.filter((entry)=>entry!==key)
        })
    },[])

    const markShown=React.useCallback((id:string)=>{
        shownAt.current.set(id,Date.now())
    },[])

    const dismiss=React.useCallback((id:string)=>{
        if(!isAllowlistedTipId(id)) return
        save({dismissTipId:id},(prev)=>{
            if(prev.dismissedTipIds.includes(id)) return prev
            if(prev.dismissedTipIds.length>=DISMISSED_TIP_LIMIT) return prev
            return {...prev,dismissedTipIds:[...prev.dismissedTipIds,id]}
        })
    },[save])

    const setTipsEnabled=React.useCallback((enabled:boolean)=>{
        save({tipsEnabled:enabled},(prev)=>({...prev,tipsEnabled:enabled}))
    },[save])

    const setDailyExpansionEnabled=React.useCallback((enabled:boolean)=>{
        save({dailyExpansionEnabled:enabled},(prev)=>({...prev,dailyExpansionEnabled:enabled}))
    },[save])

    const resetDismissedTips=React.useCallback(()=>{
        save({resetDismissedTips:true},(prev)=>({...prev,dismissedTipIds:[]}))
    },[save])

    const setWalkthrough=React.useCallback((
        patch:GuidanceStatePatch,
        next:GuidanceState['walkthrough'],
    )=>{
        save(patch,(prev)=>({...prev,walkthrough:next}))
    },[save])


    const pathname=location.pathname
    const showStepPage=React.useCallback((step:number)=>{
        const target=walkthroughRouteFor(step)
        if(target!==pathname) navigate(target)
    },[navigate,pathname])

    const startWalkthrough=React.useCallback(()=>{
        setWalkthroughVisible(true)
        setWalkthrough(
            {walkthrough:{status:'IN_PROGRESS',currentStep:0}},
            {status:'IN_PROGRESS',currentStep:0},
        )
        showStepPage(0)
    },[setWalkthrough,showStepPage])

    const resumeWalkthrough=React.useCallback(()=>{
        setWalkthroughVisible(true)
        showStepPage(stateRef.current.walkthrough.currentStep)
    },[showStepPage])

    const replayWalkthrough=React.useCallback(()=>{
        setWalkthroughVisible(true)
        setWalkthrough({replayWalkthrough:true},{status:'IN_PROGRESS',currentStep:0})
        showStepPage(0)
    },[setWalkthrough,showStepPage])

    const goToWalkthroughStep=React.useCallback((step:number)=>{
        const clamped=Math.min(Math.max(Math.trunc(step),0),WALKTHROUGH_MAX_STEP)
        setWalkthrough(
            {walkthrough:{status:'IN_PROGRESS',currentStep:clamped}},
            {status:'IN_PROGRESS',currentStep:clamped},
        )
        showStepPage(clamped)
    },[setWalkthrough,showStepPage])

    const suspendWalkthrough=React.useCallback(()=>setWalkthroughVisible(false),[])

    const [lastPathname,setLastPathname]=React.useState(pathname)
    if(lastPathname!==pathname){
        setLastPathname(pathname)
        if(walkthroughVisible&&pathname!==walkthroughRouteFor(state.walkthrough.currentStep)){
            setWalkthroughVisible(false)
        }
    }

    const skipWalkthrough=React.useCallback(()=>{
        setWalkthroughVisible(false)
        const step=stateRef.current.walkthrough.currentStep
        setWalkthrough(
            {walkthrough:{status:'SKIPPED',currentStep:step}},
            {status:'SKIPPED',currentStep:step},
        )
    },[setWalkthrough])

    const completeWalkthrough=React.useCallback(()=>{
        setWalkthroughVisible(false)
        setWalkthrough(
            {walkthrough:{status:'COMPLETED',currentStep:WALKTHROUGH_MAX_STEP}},
            {status:'COMPLETED',currentStep:WALKTHROUGH_MAX_STEP},
        )
        if(pathname!==GUIDANCE_ROUTES.dashboard) navigate(GUIDANCE_ROUTES.dashboard)
    },[setWalkthrough,navigate,pathname])

    const blocked=blockedKeys.length>0
    const route=pathname

    const evaluate=React.useCallback((
        surface:GuidanceSurface,
        facts:GuideFacts,
        options?:EvaluateOptions,
    )=>selectGuide(catalogue,surface,facts,{
        route,
        localDate,
        blocked,
        tipsEnabled:state.tipsEnabled,
        dismissedTipIds:state.dismissedTipIds,
        walkthroughActive:walkthroughVisible,
        shownAt:shownAt.current,
        manual:options?.manual,
    }),[catalogue,route,localDate,blocked,state.tipsEnabled,state.dismissedTipIds,walkthroughVisible])

    const reload=React.useCallback(()=>{
        setLoadStatus('loading')
        setReloadToken((token)=>token+1)
    },[])

    const status:GuidanceLoadStatus=userId? loadStatus : 'ready'
    const requestDailyRefresh=React.useCallback(()=>setDailyRefreshToken((token)=>token+1),[])

    const value=React.useMemo<GuidanceContextValue>(()=>({
        api,
        userId,
        state,
        status,
        unsynced,
        localDate,
        blocked,
        walkthroughVisible,
        dailyRefreshToken,
        storage,
        reload,
        retrySync,
        requestDailyRefresh,
        evaluate,
        markShown,
        dismiss,
        setTipsEnabled,
        setDailyExpansionEnabled,
        resetDismissedTips,
        setBlocked,
        startWalkthrough,
        resumeWalkthrough,
        replayWalkthrough,
        goToWalkthroughStep,
        suspendWalkthrough,
        skipWalkthrough,
        completeWalkthrough,
    }),[
        api,
        userId,
        state,
        status,
        unsynced,
        localDate,
        blocked,
        walkthroughVisible,
        dailyRefreshToken,
        storage,
        reload,
        retrySync,
        requestDailyRefresh,
        evaluate,
        markShown,
        dismiss,
        setTipsEnabled,
        setDailyExpansionEnabled,
        resetDismissedTips,
        setBlocked,
        startWalkthrough,
        resumeWalkthrough,
        replayWalkthrough,
        goToWalkthroughStep,
        suspendWalkthrough,
        skipWalkthrough,
        completeWalkthrough,
    ])

    return(
        <GuidanceContext.Provider value={value}>
            {children}
        </GuidanceContext.Provider>
    )
}