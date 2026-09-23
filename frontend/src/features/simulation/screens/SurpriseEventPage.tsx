import {useCallback,useEffect,useRef,useState} from 'react'
import {AlertTriangle,Check,Clock3,Coins,Pause,Sparkles} from 'lucide-react'
import {useNavigate,useParams} from 'react-router-dom'
import {ErrorCard,LoadingCard} from '@/components/common/AsyncStates'
import {LongButton} from '@/components/common/LongButton'
import {useSimulation} from '@/hooks/useSimulation'
import {usePauseControls} from '@/hooks/usePauseControls'
import {useRefetchAtDeadline} from '../hooks/useRefetchAtDeadline'
import {resolveSimulationEvent} from '../api'
import {SimulationPageShell} from '../components/SimulationPageShell'
import {createIdempotencyKey} from '../idempotency'
import {formatSimulationMoney} from '../presentation'
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
        <div className="flex items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#FFF1C8] px-4 py-2 text-sm font-black text-[#59430D] dark:border-[#060E20] dark:bg-[#3D351B] dark:text-[#FFE4A3]">
            <Clock3 className="size-4" aria-hidden="true"/>
            <span aria-label="Time remaining">{now===0?'--:--':`${minutes}:${seconds}`}</span>
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
                className="flex items-center gap-2 rounded-full border-2 border-[#091828] bg-white px-4 py-2 text-sm font-extrabold text-[#091828] shadow-[2px_2px_0_#091828] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2D3449] dark:bg-[#131B2E] dark:text-white"
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
    const revealPath=`${getSessionPath(sessionId)}/event`
    return(
        <SimulationPageShell
            title="Surprise event"
            onBack={()=>screen==='decision'?navigate(revealPath):navigate('/simulation')}
        >
            <section className="space-y-6">
                <div className="text-center">
                    <div className="mx-auto grid size-20 place-items-center rounded-[22px] border-2 border-[#091828] bg-[#FF6B9D] shadow-[5px_5px_0_#091828] dark:border-[#060E20] dark:bg-[#FFB1C5] dark:shadow-[5px_5px_0_#060E20]">
                        {screen==='reveal'
                            ?<Sparkles className="size-10 text-[#091828]" aria-hidden="true"/>
                            :<AlertTriangle className="size-10 text-[#091828]" aria-hidden="true"/>
                        }
                    </div>
                    <p className="mt-5 text-sm font-extrabold text-[#AC2A5D] dark:text-[#FFB1C5]">
                        Day {event.triggerDay} of {data.session.daysInMonth}
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight">
                        {screen==='reveal'?'Something unexpected!':'What will you do?'}
                    </h2>
                    <p className="mt-2 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
                        This is a fictional scenario. Your real finances are not affected.
                    </p>
                </div>
                <EventPauseButton
                    simulation={data}
                    onSimulationChange={setSimulation}
                    disabled={submitting||checkingDeadline}
                />
                {data.session.timedMode&&event.decisionExpiresAt&&(
                    <div className="flex justify-center">
                        <EventCountdown deadline={event.decisionExpiresAt}/>
                    </div>
                )}
                <div className="rounded-[22px] border-2 border-[#091828] bg-gradient-to-br from-[#FFF0F6] via-[#FFE1EC] to-[#F2EAFF] p-5 shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:from-[#2D1B2E] dark:via-[#241D35] dark:to-[#1E243B] dark:shadow-[5px_6px_0_#060E20]">
                    <div className="mb-4 flex items-center gap-2">
                        <span className="grid size-9 place-items-center rounded-full bg-[#FF6B9D] text-[#091828]">
                            <Sparkles className="size-5" aria-hidden="true"/>
                        </span>
                        <span className="text-xs font-extrabold uppercase tracking-wide text-[#AC2A5D] dark:text-[#FFB1C5]">
                            Surprise event
                        </span>
                    </div>
                    <h3 className="text-2xl font-black">{event.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#50485E] dark:text-[#D9DDE7]">
                        {event.context}
                    </p>
                </div>
                {screen==='reveal'?(
                    <LongButton
                        LongVariant="primaryPink"
                        onClick={()=>navigate(decisionPath)}
                    >
                        See my options
                    </LongButton>
                ):(
                    <>
                        <fieldset className="space-y-3" disabled={submitting||checkingDeadline}>
                            <legend className="mb-4 text-lg font-black">
                                Choose how to respond
                            </legend>
                            {event.options.map(option=>{
                                const selected=selectedOptionId===option.id
                                return(
                                    <label
                                        key={option.id}
                                        className={`block cursor-pointer rounded-[18px] border-2 p-4 transition ${selected?'border-[#091828] bg-[#FFD8E6] shadow-[4px_4px_0_#091828] dark:border-[#FFB1C5] dark:bg-[#49243B] dark:shadow-[4px_4px_0_#060E20]':'border-[#091828] bg-white shadow-[3px_3px_0_#091828] dark:border-[#2D3449] dark:bg-[#131B2E] dark:shadow-[3px_3px_0_#060E20]'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="radio"
                                                name="event-option"
                                                value={option.id}
                                                checked={selected}
                                                onChange={()=>selectOption(option.id)}
                                                className="mt-1 size-4 accent-[#AC2A5D]"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <strong className="block text-sm font-extrabold">
                                                    {option.label}
                                                </strong>
                                                <span className="mt-2 block text-xs text-[#6B6375] dark:text-[#A0AEC0]">
                                                    Immediate cost: {formatSimulationMoney(option.immediateCost)}
                                                </span>
                                                <span className="mt-1 flex items-center gap-1 text-xs text-[#6B6375] dark:text-[#A0AEC0]">
                                                    <Coins className="size-3" aria-hidden="true"/>
                                                    Fee or debt: {formatSimulationMoney(option.feeOrDebt)}
                                                </span>
                                            </span>
                                            {selected&&(
                                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#AC2A5D] text-white">
                                                    <Check className="size-4" aria-hidden="true"/>
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                )
                            })}
                        </fieldset>
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
                            LongVariant="primaryPink"
                            disabled={!selectedOptionId||submitting||checkingDeadline}
                            onClick={()=>void confirmDecision()}
                        >
                            {submitting?'Confirming decision…':checkingDeadline?'Checking event…':'Confirm decision'}
                        </LongButton>
                    </>
                )}
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