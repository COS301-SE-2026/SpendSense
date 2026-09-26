import {useCallback,useEffect,useRef,useState} from 'react'
import {Check,Clock3} from 'lucide-react'
import {useLocation,useNavigate,useParams} from 'react-router-dom'
import {ErrorCard,LoadingCard} from '@/components/common/AsyncStates'
import {LongButton} from '@/components/common/LongButton'
import {useSimulation} from '@/hooks/useSimulation'
import {ResultAcknowledgement} from '@/components/simulation/ResultAcknowledgement'
import {continueSimulation} from '../api'
import {SimulationPageShell} from '../components/SimulationPageShell'
import {createIdempotencyKey} from '../idempotency'
import {formatCompactMoney,formatPoints} from '../presentation'
import {pathForSimulationState,routeForSimulationState} from '../routing'
import type {EventResolutionResult,SimulationDetail} from '../types'

type ResultLocationState={
    eventResult?:EventResolutionResult
}

function getErrorMessage(error:unknown):string{
    return error instanceof Error?error.message:'Unable to continue the simulation.'
}

function formatSignedPoints(points:string):string{
    const amount=Number(points)
    if(!Number.isFinite(amount)){
        return points
    }
    return `${amount>0?'+':''}${formatPoints(points)}`
}

function describeCashToday(result:EventResolutionResult):string{
    const parts:string[]=[]
    const cost=Number(result.immediateCost)>0
    const fee=Number(result.feeChargedNow)>0
    if(cost&&fee){
        parts.push(`${formatCompactMoney(result.immediateCost)} + ${formatCompactMoney(result.feeChargedNow)} fee charged once`)
    }else if(cost){
        parts.push(`${formatCompactMoney(result.immediateCost)} paid now`)
    }else if(fee){
        parts.push(`${formatCompactMoney(result.feeChargedNow)} fee charged once`)
    }else{
        parts.push('Nothing to pay today')
    }
    if(Number(result.savingsUsed)>0){
        parts.push(`${formatCompactMoney(result.savingsUsed)} from Savings`)
    }
    if(Number(result.uncoveredAmount)>0){
        parts.push(`${formatCompactMoney(result.uncoveredAmount)} could not be covered`)
    }
    if(result.inMonthObligation){
        parts.push(`${formatCompactMoney(result.inMonthObligation.amountDue)} bill due Day ${result.inMonthObligation.dueDay}`)
    }
    return parts.join(' · ')
}

export function SurpriseEventResultPage(){
    const navigate=useNavigate()
    const location=useLocation()
    const {sessionId}=useParams<{sessionId:string}>()
    const {data,loading,error,refetch,setSimulation}=useSimulation(sessionId)
    const [submitting,setSubmitting]=useState(false)
    const [continueError,setContinueError]=useState<string|null>(null)
    const submittingRef=useRef(false)
    const continueKeyRef=useRef<string|null>(null)
    const locationState=location.state as ResultLocationState|null
    const locationResult=locationState?.eventResult
    const validResult=data?.session.status==='ACTIVE'&&data.session.pending.type==='EVENT_RESULT'
    const routeFromDetail=useCallback((detail:SimulationDetail)=>{
        if(!sessionId){
            return
        }
        if(routeForSimulationState(detail)==='event-result'){
            return
        }
        navigate(pathForSimulationState(detail),{replace:true,state:null})
    },[navigate,sessionId])
    useEffect(()=>{
        if(data&&!validResult){
            Promise.resolve().then(()=>routeFromDetail(data))
        }
    },[data,validResult,routeFromDetail])
    const continueGame=async()=>{
        if(!sessionId||!data||!validResult||
            !data.allowedActions.includes('CONTINUE')||submittingRef.current){
            return
        }
        submittingRef.current=true
        setSubmitting(true)
        setContinueError(null)
        const key=continueKeyRef.current??createIdempotencyKey()
        continueKeyRef.current=key
        try{
            const result=await continueSimulation(sessionId,key)
            setSimulation(result)
            continueKeyRef.current=null
            navigate(pathForSimulationState(result),{
                replace:true,
                state:null
            })
        }catch(requestError){
            const refreshed=await refetch()
            if(refreshed&&routeForSimulationState(refreshed)!=='event-result'){
                continueKeyRef.current=null
                routeFromDetail(refreshed)
            }else{
                setContinueError(getErrorMessage(requestError))
            }
        }finally{
            submittingRef.current=false
            setSubmitting(false)
        }
    }
    if(!sessionId){
        return(
            <SimulationPageShell title="Event result">
                <ErrorCard message="This simulation session is missing." onRetry={()=>navigate('/simulation')}/>
            </SimulationPageShell>
        )
    }
    if(loading&&!data){
        return(
            <SimulationPageShell title="Event result">
                <LoadingCard label="Loading your event result"/>
            </SimulationPageShell>
        )
    }
    if(error&&!data){
        return(
            <SimulationPageShell title="Event result">
                <ErrorCard message={error} onRetry={()=>void refetch()}/>
            </SimulationPageShell>
        )
    }
    if(!data||!validResult){
        return(
            <SimulationPageShell title="Event result">
                <LoadingCard label="Checking your simulation state"/>
            </SimulationPageShell>
        )
    }
    const eventId=data.session.pending.id
    const eventResult=locationResult&&locationResult.id===eventId
        ?locationResult
        :null
    const eventEntries=data.recentScoreEntries.filter(entry=>
        entry.sourceId===eventId&&
        (entry.sourceType==='EVENT_DECISION'||entry.sourceType==='EVENT_EXPIRY')
    )
    const expired=eventEntries.some(entry=>entry.sourceType==='EVENT_EXPIRY')
    const introducedObligation=eventResult?.introducedObligationId
        ?data.obligations.find(obligation=>obligation.id===eventResult.introducedObligationId)
        :null
    const paidToday=eventResult
        ?((Math.round(Number(eventResult.currentUsed)*100)+Math.round(Number(eventResult.savingsUsed)*100))/100).toFixed(2)
        :null
    return(
        <SimulationPageShell title="Event result" onBack={()=>{}}>
            <section className="space-y-6">
                <div className="text-center">
                    <div className={`mx-auto grid size-24 place-items-center rounded-full border-2 border-[#091828] shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:shadow-[5px_6px_0_#060E20] ${expired?'bg-[#FFE09A]':'bg-[#6CCABB]'}`}>
                        {expired
                            ?<Clock3 className="size-12 text-[#091828]" strokeWidth={2.5} aria-hidden="true"/>
                            :<Check className="size-12 text-[#091828]" strokeWidth={3} aria-hidden="true"/>
                        }
                    </div>
                    <p className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-[#AC2A5D] dark:text-[#FFB1C5]">
                        {expired?'Time ran out':'Decision complete'}
                    </p>
                    {eventResult?(
                        <>
                            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight">
                                {eventResult.label}
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#6B6375] dark:text-[#A0AEC0]">
                                {eventResult.explanation}
                            </p>
                        </>
                    ):(
                        <p className="mt-2 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
                            Day {data.session.currentDay} of {data.session.daysInMonth}
                        </p>
                    )}
                </div>
                {eventResult&&paidToday&&(
                    <>
                        <div className="flex items-center gap-4 rounded-[22px] border-2 border-[#091828] bg-[#FFC6DA] p-5 shadow-[5px_6px_0_#091828] [transform:rotate(-1.5deg)] dark:border-[#060E20] dark:bg-[#4E2438] dark:shadow-[5px_6px_0_#060E20]">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-black">Cash today</h3>
                                <p className="mt-1 text-xs leading-relaxed text-[#50485E] dark:text-[#D9DDE7]">
                                    {describeCashToday(eventResult)}
                                </p>
                            </div>
                            <p className="shrink-0 text-2xl font-black">
                                {formatCompactMoney(paidToday)} today
                            </p>
                        </div>
                        <div className="flex items-center gap-4 rounded-[22px] border-2 border-[#091828] bg-[#FFE09A] p-5 shadow-[5px_6px_0_#091828] [transform:rotate(1deg)] dark:border-[#060E20] dark:bg-[#4A3C17] dark:shadow-[5px_6px_0_#060E20]">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-black">Points earned</h3>
                                <p className="mt-1 text-xs text-[#50485E] dark:text-[#D9DDE7]">
                                    Each choice has its own points, shown once you decide.
                                </p>
                            </div>
                            <p className="shrink-0 text-3xl font-black">
                                {formatSignedPoints(eventResult.pointsAwarded)}
                            </p>
                        </div>
                    </>
                )}
                {introducedObligation&&(
                    <div className="flex items-center gap-4 rounded-[22px] border-2 border-[#091828] bg-[#BDE7DC] p-5 shadow-[4px_5px_0_#091828] dark:border-[#060E20] dark:bg-[#1D4A43] dark:shadow-[4px_5px_0_#060E20]">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black uppercase tracking-wide text-[#087D6A] dark:text-[#8FE0D2]">
                                New obligation
                            </p>
                            <h3 className="mt-1 text-lg font-black">{introducedObligation.name}</h3>
                            <p className="text-sm">Due on day {introducedObligation.dueDay}</p>
                        </div>
                        <p className="shrink-0 text-xl font-black">
                            {formatCompactMoney(introducedObligation.amountDue)}
                        </p>
                    </div>
                )}
                {!eventResult&&(
                    <ResultAcknowledgement
                        detail={data}
                        kind="event"
                        status={expired?'expired':'recovered'}
                        onContinue={()=>void continueGame()}
                        showContinue={false}
                    />
                )}
                <dl
                    aria-label="Your updated balances"
                    className="divide-y divide-[#DCEBE7] rounded-[22px] border-2 border-[#CFE6DF] bg-white px-5 dark:divide-[#2D3449] dark:border-[#2D3449] dark:bg-[#131B2E]"
                >
                    <div className="flex items-center justify-between gap-3 py-4">
                        <dt>Current</dt>
                        <dd className="font-black">{formatCompactMoney(data.session.currentBalance)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-4">
                        <dt>Savings</dt>
                        <dd className="font-black">{formatCompactMoney(data.session.savingsBalance)}</dd>
                    </div>
                </dl>
                {!eventResult&&eventEntries.length>0&&(
                    <div className="rounded-[22px] border-2 border-[#091828] bg-white p-5 shadow-[4px_5px_0_#091828] dark:border-[#2D3449] dark:bg-[#131B2E] dark:shadow-[4px_5px_0_#060E20]">
                        <h3 className="mb-4 text-lg font-black">Recent event activity</h3>
                        <div className="space-y-3">
                            {eventEntries.map(entry=>(
                                <div key={entry.id} className="flex items-start justify-between gap-4 text-sm">
                                    <p className="text-[#6B6375] dark:text-[#A0AEC0]">
                                        {entry.reason}
                                    </p>
                                    <span className="shrink-0 font-extrabold">
                                        {formatSignedPoints(entry.pointsDelta)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {continueError&&(
                    <p role="alert" className="rounded-xl bg-[#FCE0E8] p-3 text-sm font-semibold text-[#AC2A5D]">
                        {continueError}
                    </p>
                )}
                <LongButton
                    LongVariant="primaryDark"
                    LongSize="lg"
                    showArrow={false}
                    disabled={submitting||!data.allowedActions.includes('CONTINUE')}
                    onClick={()=>void continueGame()}
                >
                    {submitting?'Returning to game…':'Back to game'}
                </LongButton>
            </section>
        </SimulationPageShell>
    )
}
