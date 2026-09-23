import {useCallback,useEffect,useState} from 'react'
import {Check,Sparkles,Star,Trophy} from 'lucide-react'
import {useNavigate,useParams} from 'react-router-dom'
import {ErrorCard,LoadingCard} from '@/components/common/AsyncStates'
import {LongButton} from '@/components/common/LongButton'
import {getGamificationProfile} from '@/features/gamification/gamificationApi'
import type {GamificationProfile} from '@/hooks/useGamificationProfile'
import {useSimulation} from '@/hooks/useSimulation'
import {SimulationPageShell} from '../components/SimulationPageShell'
import {routeForSimulationState} from '../routing'
import type {SimulationDetail} from '../types'

function getSessionPath(sessionId:string):string{
    return `/simulation/session/${sessionId}`
}

function routeFromDetail(detail:SimulationDetail,sessionId:string):string{
    const base=getSessionPath(sessionId)
    switch(routeForSimulationState(detail)){
        case 'briefing':
            return `/simulation/setup/${sessionId}`
        case 'event-reveal':
            return `${base}/event`
        case 'event-result':
            return `${base}/event-result`
        case 'payment-result':
            return `${base}/payment-result`
        case 'summary':
            return `${base}/summary`
        case 'paused':
            return `${base}/paused`
        case 'entry':
        case 'recovery':
            return '/simulation'
        default:
            return `${base}/board`
    }
}

export default function MonthSummaryPage(){
    const navigate=useNavigate()
    const {sessionId}=useParams<{sessionId:string}>()
    const {data,loading,error,refetch}=useSimulation(sessionId)
    const [firstCompletionBadge,setFirstCompletionBadge]=useState(false)
    const [profileLoading,setProfileLoading]=useState(true)
    const [profileError,setProfileError]=useState<string|null>(null)
    const completed=data?.session.status==='COMPLETED'&&data.completion!==null
    const refreshProfile=useCallback(async()=>{
        setProfileLoading(true)
        setProfileError(null)
        try{
            const response=await getGamificationProfile() as {data:GamificationProfile}
            setFirstCompletionBadge(
                response.data.badges.some(badge=>
                    badge.badgeKey==='FIRST_SIMULATION_COMPLETE'
                )
            )
        }catch(requestError){
            setFirstCompletionBadge(false)
            setProfileError(
                requestError instanceof Error
                    ?requestError.message
                    :'Unable to check your completion badge.'
            )
        }finally{
            setProfileLoading(false)
        }
    },[])
    useEffect(()=>{
        if(completed){
            void Promise.resolve().then(refreshProfile)
        }
    },[completed,refreshProfile])
    useEffect(()=>{
        if(!data||data.session.status==='COMPLETED'||!sessionId){
            return
        }
        Promise.resolve().then(()=>{
            navigate(routeFromDetail(data,sessionId),{replace:true})
        })
    },[data,navigate,sessionId])
    if(!sessionId){
        return(
            <SimulationPageShell title="Month complete">
                <ErrorCard
                    message="This simulation session is missing."
                    onRetry={()=>navigate('/simulation')}
                />
            </SimulationPageShell>
        )
    }
    if(loading&&!data){
        return(
            <SimulationPageShell title="Month complete">
                <LoadingCard label="Loading your completed month"/>
            </SimulationPageShell>
        )
    }
    if(error&&!data){
        return(
            <SimulationPageShell title="Month complete">
                <ErrorCard message={error} onRetry={()=>void refetch()}/>
            </SimulationPageShell>
        )
    }
    if(!data){
        return(
            <SimulationPageShell title="Month complete">
                <ErrorCard
                    message="Unable to load your completed month."
                    onRetry={()=>void refetch()}
                />
            </SimulationPageShell>
        )
    }
    if(data.session.status!=='COMPLETED'){
        return(
            <SimulationPageShell title="Month complete">
                <LoadingCard label="Checking your simulation state"/>
            </SimulationPageShell>
        )
    }
    if(!data.completion){
        return(
            <SimulationPageShell title="Month complete">
                <ErrorCard
                    message="Your completion summary is not available yet."
                    onRetry={()=>void refetch()}
                />
            </SimulationPageShell>
        )
    }
    const completion=data.completion
    return(
        <SimulationPageShell
            title="Month complete"
            onBack={()=>navigate('/domains/dashboard')}
        >
            <section className="space-y-6">
                <div className="text-center">
                    <div className="mx-auto grid size-24 place-items-center rounded-[24px] border-2 border-[#091828] bg-[#FF6B9D] shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:bg-[#FFB1C5] dark:shadow-[5px_6px_0_#060E20]">
                        <Trophy className="size-12 text-[#091828]" aria-hidden="true"/>
                    </div>
                    <p className="mt-5 text-sm font-extrabold text-[#AC2A5D] dark:text-[#FFB1C5]">
                        Your simulated month
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight">
                        Month complete!
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[#6B6375] dark:text-[#A0AEC0]">
                        You made it through {data.session.daysInMonth} fictional days.
                        Your results are ready to explore.
                    </p>
                </div>
                <div className="rounded-[22px] border-2 border-[#091828] bg-gradient-to-br from-[#FFF0F6] via-[#FFE1EC] to-[#F2EAFF] p-6 text-center shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:from-[#2D1B2E] dark:via-[#241D35] dark:to-[#1E243B] dark:shadow-[5px_6px_0_#060E20]">
                    <Star className="mx-auto size-8 text-[#AC2A5D] dark:text-[#FFB1C5]" aria-hidden="true"/>
                    <p className="mt-3 text-sm font-extrabold text-[#AC2A5D] dark:text-[#FFB1C5]">
                        Your final score
                    </p>
                    <strong className="mt-2 block text-5xl font-black tracking-tight">
                        {completion.finalScore}
                    </strong>
                    <p className="mt-2 text-sm font-semibold">
                        points
                    </p>
                    <div className="mt-5 rounded-xl border-2 border-[#091828] bg-[#FFF1C8] px-4 py-3 font-black text-[#59430D] dark:border-[#060E20] dark:bg-[#3D351B] dark:text-[#FFE4A3]">
                        <Sparkles className="mr-2 inline size-5" aria-hidden="true"/>
                        15 XP awarded
                    </div>
                </div>
                {firstCompletionBadge&&(
                    <div className="rounded-[22px] border-2 border-[#091828] bg-[#E0F5EF] p-5 shadow-[4px_5px_0_#091828] dark:border-[#060E20] dark:bg-[#143D38] dark:shadow-[4px_5px_0_#060E20]">
                        <div className="flex items-center gap-3">
                            <span className="grid size-11 place-items-center rounded-full bg-[#FF6B9D] text-[#091828]">
                                <Trophy className="size-6" aria-hidden="true"/>
                            </span>
                            <div>
                                <h3 className="text-lg font-black">
                                    First month completed!
                                </h3>
                                <p className="mt-1 text-xs font-semibold">
                                    Your first simulation completion badge is unlocked.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {profileLoading&&(
                    <p className="text-center text-xs text-[#6B6375] dark:text-[#A0AEC0]">
                        Checking your completion badge…
                    </p>
                )}
                {profileError&&(
                    <div className="rounded-xl bg-[#FFF1C8] p-4 text-sm text-[#59430D] dark:bg-[#3D351B] dark:text-[#FFE4A3]">
                        <p>Your completion badge could not be checked.</p>
                        <button
                            type="button"
                            onClick={()=>void refreshProfile()}
                            className="mt-2 font-extrabold underline"
                        >
                            Retry badge check
                        </button>
                    </div>
                )}
                <div className="space-y-3 pt-2">
                    <LongButton
                        LongVariant="primaryPink"
                        onClick={()=>navigate(`${getSessionPath(sessionId)}/score-breakdown`)}
                    >
                        Review score breakdown
                    </LongButton>
                    <LongButton
                        LongVariant="primaryDark"
                        onClick={()=>navigate('/simulation')}
                    >
                        Play again
                    </LongButton>
                    <button
                        type="button"
                        onClick={()=>navigate('/domains/dashboard')}
                        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-white px-5 py-3 font-extrabold text-[#091828] shadow-[3px_3px_0_#091828] transition hover:bg-[#FFF3FA] dark:border-[#2D3449] dark:bg-[#131B2E] dark:text-white"
                    >
                        <Check className="size-4" aria-hidden="true"/>
                        Return to dashboard
                    </button>
                </div>
                <p className="pb-4 text-center text-xs text-[#6B6375] dark:text-[#A0AEC0]">
                    Your simulated month used fictional money.
                    Your real financial balances were not changed.
                </p>
            </section>
        </SimulationPageShell>
    )
}