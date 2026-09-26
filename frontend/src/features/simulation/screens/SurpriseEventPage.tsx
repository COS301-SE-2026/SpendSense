import {useCallback,useEffect,useRef,useState} from 'react'
import {Pause} from 'lucide-react'
import {useNavigate,useParams} from 'react-router-dom'
import {ErrorCard,LoadingCard} from '@/components/common/AsyncStates'
import {LongButton} from '@/components/common/LongButton'
import {useSimulation} from '@/hooks/useSimulation'
import {usePauseControls} from '@/hooks/usePauseControls'
import {useRefetchAtDeadline} from '../hooks/useRefetchAtDeadline'
import {resolveSimulationEvent} from '../api'
import {SimulationPageShell} from '../components/SimulationPageShell'
import {createIdempotencyKey} from '../idempotency'
import {EventOptionHand} from '@/components/simulation/EventOptionHand'
import {pathForSimulationState,routeForSimulationState} from '../routing'
import type {SimulationDetail} from '../types'

type EventScreen='reveal'|'decision'

function getErrorMessage(error:unknown):string{
    return error instanceof Error?error.message:'Unable to resolve this event.'
}

function isDecisionExpired(error:unknown):boolean{
    if(typeof error!=='object'||error===null){
        return false
    }
    const response=error as {
        message?:unknown
        error?:{
            message?:unknown
            code?:unknown
        }
    }
    return response.message==='EVENT_DECISION_EXPIRED'||
        response.error?.code==='EVENT_DECISION_EXPIRED'||
        (typeof response.message==='string'&&response.message.includes('EVENT_DECISION_EXPIRED'))||
        (typeof response.error?.message==='string'&&response.error.message.includes('EVENT_DECISION_EXPIRED'))
}

function getSessionPath(sessionId:string):string{
    return `/simulation/session/${sessionId}`
}

function getEventResultPath(sessionId:string):string{
    return `/simulation/session/${sessionId}/event-result`
}

function EventCountdown({deadline}:Readonly<{deadline:string|null}>){
    const [now,setNow]=useState(0)
    useEffect(()=>{
        if(!deadline){
            return
        }
        const interval=window.setInterval(()=>{
            setNow(Date.now())
        },250)
        return ()=>window.clearInterval(interval)
    },[deadline])
    if(!deadline){
        return null
    }
    const remaining=now===0?0:Math.max(0,Math.ceil((Date.parse(deadline)-now)/1000))
    const minutes=Math.floor(remaining/60)
    const seconds=String(remaining%60).padStart(2,'0')
    return(
        <div className="shrink-0 rounded-2xl bg-[#FF6B9D] px-4 py-2 text-lg font-black tabular-nums text-[#091828] dark:bg-[#FFB1C5]">
            <span aria-label="Time remaining">{now===0?'--:--':`${String(minutes).padStart(2,'0')}:${seconds}`}</span>
        </div>
    )
}

function EventPauseButton({simulation,onSimulationChange,disabled}:Readonly<{
    simulation:SimulationDetail
    onSimulationChange:(detail:SimulationDetail)=>void
    disabled:boolean
}>){
    const {pause,pausing,pauseError}=usePauseControls({simulation,onSimulationChange})
    return(
        <div className="flex flex-col items-center gap-2">
            <button
                type="button"
                disabled={disabled||pausing||simulation.session.status!=='ACTIVE'}
                onClick={()=>void pause()}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold text-[#6B6375] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#A0AEC0]"
            >
                <Pause className="size-4" aria-hidden="true"/>
                {pausing?'Pausing…':'Pause month'}
            </button>
            {pauseError&&<p role="alert" className="text-sm font-semibold text-[#AC2A5D]">{pauseError}</p>}
        </div>
    )
}

function EventScreenContent({screen}:Readonly<{screen:EventScreen}>){
    const navigate=useNavigate()
    const {sessionId}=useParams<{sessionId:string}>()
    const {data,loading,error,refetch,setSimulation}=useSimulation(sessionId)
    const [selectedOptionId,setSelectedOptionId]=useState<string|null>(null)
    const [infoOpen,setInfoOpen]=useState(false)
    const [submitting,setSubmitting]=useState(false)
    const [decisionError,setDecisionError]=useState<string|null>(null)
    const [checkingDeadline,setCheckingDeadline]=useState(false)
    const submittingRef=useRef(false)
    const decisionRef=useRef<{eventId:string;optionId:string;key:string}|null>(null)
    const event=data?.currentEvent
    const validEvent=data?.session.status==='ACTIVE'&&
        data.session.pending.type==='EVENT_REVEAL'&&
        event!==null&&event!==undefined

    const routeFromDetail=useCallback((detail:SimulationDetail)=>{
        if(!sessionId){
            return
        }
        const route=routeForSimulationState(detail)
        if(route==='event-reveal'){
            return
        }
        if(route==='event-result'){
            navigate(getEventResultPath(sessionId),{replace:true})
            return
        }
        navigate(pathForSimulationState(detail),{replace:true})
    },[navigate,sessionId])

    const refreshEvent=useCallback(async()=>{
        if(!sessionId){
            return
        }
        setCheckingDeadline(true)
        try{
            const refreshed=await refetch()
            if(refreshed){
                routeFromDetail(refreshed)
            }
        }finally{
            setCheckingDeadline(false)
        }
    },[refetch,routeFromDetail,sessionId])

    useRefetchAtDeadline(
        validEvent&&data.session.timedMode?event.decisionExpiresAt:null,
        refreshEvent
    )

    useEffect(()=>{
        if(data&&!validEvent){
            Promise.resolve().then(()=>routeFromDetail(data))
        }
    },[data,validEvent,routeFromDetail])

    const selectOption=(optionId:string)=>{
        if(submittingRef.current){
            return
        }
        setSelectedOptionId(optionId)
        setDecisionError(null)
        decisionRef.current=null
    }

    const confirmDecision=async()=>{
        if(!sessionId||!event||!validEvent||!selectedOptionId||submittingRef.current){
            return
        }
        if(!data.allowedActions.includes('RESOLVE_EVENT')){
            void refreshEvent()
            return
        }
        submittingRef.current=true
        setSubmitting(true)
        setDecisionError(null)
        const existing=decisionRef.current
        const decision=existing&&existing.eventId===event.id&&
            existing.optionId===selectedOptionId
            ?existing
            :{
                eventId:event.id,
                optionId:selectedOptionId,
                key:createIdempotencyKey()
            }
        decisionRef.current=decision
        try{
            const result=await resolveSimulationEvent(
                sessionId,
                decision.eventId,
                decision.optionId,
                decision.key
            )
            setSimulation(result)
            decisionRef.current=null
            navigate(getEventResultPath(sessionId),{
                replace:true,
                state:{
                    eventResult:result.event
                }
            })
        }catch(requestError){
            if(isDecisionExpired(requestError)){
                decisionRef.current=null
                await refreshEvent()
            }else{
                setDecisionError(getErrorMessage(requestError))
            }
        }finally{
            submittingRef.current=false
            setSubmitting(false)
        }
    }

    if(!sessionId){
        return(
            <SimulationPageShell title="Surprise event">
                <ErrorCard message="This simulation session is missing." onRetry={()=>navigate('/simulation')}/>
            </SimulationPageShell>
        )
    }

    if(loading&&!data){
        return(
            <SimulationPageShell title="Surprise event">
                <LoadingCard label="Loading your surprise event"/>
            </SimulationPageShell>
        )
    }

    if(error&&!data){
        return(
            <SimulationPageShell title="Surprise event">
                <ErrorCard message={error} onRetry={()=>void refetch()}/>
            </SimulationPageShell>
        )
    }

    if(!validEvent||!event){
        return(
            <SimulationPageShell title="Surprise event">
                <LoadingCard label="Checking your simulation state"/>
            </SimulationPageShell>
        )
    }

    const decisionPath=`${getSessionPath(sessionId)}/event/decision`
    const boardPath=`${getSessionPath(sessionId)}/board`
    const showCountdown=data.session.timedMode&&event.decisionExpiresAt
    return(
        <SimulationPageShell
            title={screen==='reveal'?'Something unexpected!':'Event choice'}
            onBack={()=>navigate(screen==='decision'?boardPath:'/simulation')}
            infoTitle="About this event"
            infoButtonLabel="About this event"
            onInfoOpenChange={setInfoOpen}
            infoContent={(
                <div className="space-y-3">
                    <p className="font-bold text-[#AC2A5D] dark:text-[#FFB1C5]">
                        Surprise event · Day {event.triggerDay} of {data.session.daysInMonth}
                    </p>
                    <p>{event.context}</p>
                    <p>Choose an option to decide how your simulation responds. Your real finances are not affected.</p>
                </div>
            )}
        >
            <section className="space-y-6">
                <div className="-mt-6 flex items-start justify-between gap-3">
                    <h2 className="text-3xl font-black leading-tight tracking-tight">
                        {event.title}
                    </h2>
                    {showCountdown&&<EventCountdown deadline={event.decisionExpiresAt}/>}
                </div>
                {screen==='reveal'&&(
                    <div className="rounded-[22px] border-2 border-[#091828] bg-[#FFEAF1] p-5 shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:bg-[#2D1B2E] dark:shadow-[5px_6px_0_#060E20]">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-[#AC2A5D] dark:text-[#FFB1C5]">
                            Surprise event · Day {event.triggerDay} of {data.session.daysInMonth}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[#50485E] dark:text-[#D9DDE7]">
                            {event.context}
                        </p>
                    </div>
                )}
                {screen==='reveal'?(
                    <>
                        <p className="text-center text-sm text-[#6B6375] dark:text-[#A0AEC0]">
                            This is a fictional scenario. Your real finances are not affected.
                        </p>
                        <LongButton
                            LongVariant="primaryDark"
                            LongSize="lg"
                            onClick={()=>navigate(decisionPath)}
                        >
                            See my options
                        </LongButton>
                    </>
                ):(
                    <>
                        <EventOptionHand
                            options={event.options}
                            selectedOptionId={selectedOptionId}
                            onSelect={selectOption}
                            disabled={submitting||checkingDeadline}
                            hideNavigation={infoOpen}
                        />
                        {decisionError&&(
                            <p role="alert" className="rounded-xl bg-[#FCE0E8] p-3 text-sm font-semibold text-[#AC2A5D]">
                                {decisionError}
                            </p>
                        )}
                        {error&&(
                            <p role="alert" className="rounded-xl bg-[#FCE0E8] p-3 text-sm font-semibold text-[#AC2A5D]">
                                {error}
                            </p>
                        )}
                        <LongButton
                            LongVariant="primaryDark"
                            LongSize="lg"
                            showArrow={false}
                            disabled={!selectedOptionId||submitting||checkingDeadline}
                            onClick={()=>void confirmDecision()}
                            className="disabled:bg-[#8E989C] disabled:text-white disabled:opacity-100"
                        >
                            {submitting?'Confirming choice…':checkingDeadline?'Checking event…':'Confirm choice'}
                        </LongButton>
                    </>
                )}
                <EventPauseButton
                    simulation={data}
                    onSimulationChange={setSimulation}
                    disabled={submitting||checkingDeadline}
                />
            </section>
        </SimulationPageShell>
    )
}

export function SurpriseEventRevealPage(){
    return <EventScreenContent screen="reveal"/>
}

export function SurpriseEventDecisionPage(){
    return <EventScreenContent screen="decision"/>
}