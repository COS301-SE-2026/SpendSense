import {useCallback,useEffect,useRef,useState} from 'react'
import {Check,Clock3,Coins,Wallet} from 'lucide-react'
import {useLocation,useNavigate,useParams} from 'react-router-dom'
import {ErrorCard,LoadingCard} from '@/components/common/AsyncStates'
import {LongButton} from '@/components/common/LongButton'
import {useSimulation} from '@/hooks/useSimulation'
import {ResultAcknowledgement} from '@/components/simulation/ResultAcknowledgement'
import {continueSimulation} from '../api'
import {SimulationPageShell} from '../components/SimulationPageShell'
import {createIdempotencyKey} from '../idempotency'
import {formatSimulationMoney} from '../presentation'
import {pathForSimulationState,routeForSimulationState} from '../routing'
import type {EventResolutionResult,SimulationDetail} from '../types'

type ResultLocationState={
    eventResult?:EventResolutionResult
}

function getErrorMessage(error:unknown):string{
    return error instanceof Error?error.message:'Unable to continue the simulation.'
}

function formatPoints(points:string):string{
    const amount=Number(points)
    if(!Number.isFinite(amount)){
        return points
    }
    return `${amount>0?'+':''}${points} points`
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
    return(
        <SimulationPageShell title="Event result" onBack={()=>{}}>
            <section className="space-y-6">
                <div className="text-center">
                    <div className="mx-auto grid size-20 place-items-center rounded-[22px] border-2 border-[#091828] bg-[#FF6B9D] shadow-[5px_5px_0_#091828] dark:border-[#060E20] dark:bg-[#FFB1C5] dark:shadow-[5px_5px_0_#060E20]">
                        {expired
                            ?<Clock3 className="size-10 text-[#091828]" aria-hidden="true"/>
                            :<Check className="size-10 text-[#091828]" aria-hidden="true"/>
                        }
                    </div>
                    <p className="mt-5 text-sm font-extrabold text-[#AC2A5D] dark:text-[#FFB1C5]">
                        Day {data.session.currentDay} of {data.session.daysInMonth}
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight">
                        {expired?'Time ran out':'Decision applied!'}
                    </h2>
                    <p className="mt-2 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
                        {expired
                            ?'Your simulated month has recorded the event outcome.'
                            :'Your simulated month has been updated.'}
                    </p>
                </div>
                {eventResult&&(
                    <div className="rounded-[22px] border-2 border-[#091828] bg-gradient-to-br from-[#FFF0F6] via-[#FFE1EC] to-[#F2EAFF] p-5 shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:from-[#2D1B2E] dark:via-[#241D35] dark:to-[#1E243B] dark:shadow-[5px_6px_0_#060E20]">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-[#AC2A5D] dark:text-[#FFB1C5]">
                            Your choice
                        </p>
                        <h3 className="mt-2 text-xl font-black">{eventResult.label}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#50485E] dark:text-[#D9DDE7]">
                            {eventResult.explanation}
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
                {eventResult&&(
                    <div className="rounded-[22px] border-2 border-[#091828] bg-white p-5 shadow-[4px_5px_0_#091828] dark:border-[#2D3449] dark:bg-[#131B2E] dark:shadow-[4px_5px_0_#060E20]">
                        <h3 className="mb-4 text-lg font-black">What changed?</h3>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#6B6375] dark:text-[#A0AEC0]">Immediate cost</dt>
                                <dd className="font-extrabold">{formatSimulationMoney(eventResult.immediateCost)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#6B6375] dark:text-[#A0AEC0]">Fee or debt</dt>
                                <dd className="font-extrabold">{formatSimulationMoney(eventResult.feeOrDebt)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#6B6375] dark:text-[#A0AEC0]">Paid from Current</dt>
                                <dd className="font-extrabold">{formatSimulationMoney(eventResult.currentUsed)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#6B6375] dark:text-[#A0AEC0]">Paid from Savings</dt>
                                <dd className="font-extrabold">{formatSimulationMoney(eventResult.savingsUsed)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#6B6375] dark:text-[#A0AEC0]">Uncovered amount</dt>
                                <dd className="font-extrabold">{formatSimulationMoney(eventResult.uncoveredAmount)}</dd>
                            </div>
                        </dl>
                        <div className="mt-4 rounded-xl bg-[#FFF1C8] px-4 py-3 text-center font-black text-[#59430D] dark:bg-[#3D351B] dark:text-[#FFE4A3]">
                            {formatPoints(eventResult.pointsAwarded)}
                        </div>
                    </div>
                )}
                <div className="rounded-[22px] border-2 border-[#091828] bg-white p-5 shadow-[4px_5px_0_#091828] dark:border-[#2D3449] dark:bg-[#131B2E] dark:shadow-[4px_5px_0_#060E20]">
                    <div className="mb-4 flex items-center gap-2">
                        <Wallet className="size-5 text-[#AC2A5D]" aria-hidden="true"/>
                        <h3 className="text-lg font-black">Your updated balances</h3>
                    </div>
                    <dl className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-sm text-[#6B6375] dark:text-[#A0AEC0]">Current</dt>
                            <dd className="font-black">{formatSimulationMoney(data.session.currentBalance)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-sm text-[#6B6375] dark:text-[#A0AEC0]">Savings</dt>
                            <dd className="font-black">{formatSimulationMoney(data.session.savingsBalance)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-[#DCEBE7] pt-3 dark:border-[#2D3449]">
                            <dt className="text-sm font-extrabold">Current score</dt>
                            <dd className="font-black">{formatPoints(data.session.score)}</dd>
                        </div>
                    </dl>
                </div>
                {introducedObligation&&(
                    <div className="rounded-[22px] border-2 border-[#091828] bg-[#FFF1C8] p-5 shadow-[4px_5px_0_#091828] dark:border-[#060E20] dark:bg-[#3D351B] dark:shadow-[4px_5px_0_#060E20]">
                        <div className="flex items-center gap-2">
                            <Coins className="size-5" aria-hidden="true"/>
                            <h3 className="text-lg font-black">New obligation</h3>
                        </div>
                        <p className="mt-3 font-extrabold">{introducedObligation.name}</p>
                        <p className="mt-1 text-sm">
                            {formatSimulationMoney(introducedObligation.amountDue)}
                        </p>
                        <p className="mt-1 text-sm">Due on day {introducedObligation.dueDay}</p>
                    </div>
                )}
                {eventEntries.length>0&&(
                    <div className="rounded-[22px] border-2 border-[#091828] bg-white p-5 shadow-[4px_5px_0_#091828] dark:border-[#2D3449] dark:bg-[#131B2E] dark:shadow-[4px_5px_0_#060E20]">
                        <h3 className="mb-4 text-lg font-black">Recent event activity</h3>
                        <div className="space-y-3">
                            {eventEntries.map(entry=>(
                                <div key={entry.id} className="flex items-start justify-between gap-4 text-sm">
                                    <p className="text-[#6B6375] dark:text-[#A0AEC0]">
                                        {entry.reason}
                                    </p>
                                    <span className="shrink-0 font-extrabold">
                                        {formatPoints(entry.pointsDelta)}
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
                    LongVariant="primaryPink"
                    disabled={submitting||!data.allowedActions.includes('CONTINUE')}
                    onClick={()=>void continueGame()}
                >
                    {submitting
                        ?'Returning to game…'
                        :<>Back to game</>}
                </LongButton>
            </section>
        </SimulationPageShell>
    )
}