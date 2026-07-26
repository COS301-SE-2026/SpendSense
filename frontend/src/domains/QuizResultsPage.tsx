import {useEffect} from "react"
import {Link,useNavigate,useParams} from "react-router-dom"
import {AlertTriangle,ArrowRight,PartyPopper,X,} from "lucide-react"
import { XpPill } from "@/components/common/XpPill"
import { StreakFlame } from "@/components/common/StreakFlame"
import {useQuizSession} from "@/hooks/useQuizSession"
import type {QuizTopic} from "@/features/quiz/quizTypes"

export default function QuizResultsPage(){
    const navigate=useNavigate()
    const {sessionId}=useParams<{sessionId:string}>()
    const {session,result,isLoading,error,resumeSession}=useQuizSession()
    useEffect(()=>{
        if(!sessionId){
            return
        }
        void resumeSession(sessionId)
    },[sessionId,resumeSession])
    useEffect(()=>{
        if(!sessionId||isLoading||!session){
            return
        }
        if(!result){
            navigate(`/quiz/session/${sessionId}`,{replace:true})
        }
    },[navigate,sessionId,isLoading,session,result])
    if(!sessionId){
        return <QuizResultsError message="This quiz session is invalid."/>
    }
    if(isLoading){
        return <QuizResultsSkeleton/>
    }
    if(error&&!session){
        return(
            <QuizResultsError
                message={error}
                onRetry={()=>void resumeSession(sessionId)}
            />
        )
    }
    if(!session||!result){
        return null
    }
    const completionMessage=session.type==="TOPIC"&&session.topic?`You've finished the ${formatTopicName(session.topic)} quiz.`:"You've finished today's quiz."
    const hadRequeues=result.answeredAttempts>result.totalQuestions
    return(
        <div className="min-h-screen bg-[#F4FBF7] pb-16">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className="flex items-center gap-3">
                    <Link
                        to="/quests"
                        aria-label="Exit quiz"
                        className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#E3EAE6] shadow-[4px_4px_0_#091828]"
                    >
                        <X className="size-5 text-[#091828]"/>
                    </Link>
                    <div className="flex flex-1 items-center justify-center">
                        <div
                            className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828]"
                            style={{transform:"rotate(-3deg)"}}
                        >
                            <span className="text-base font-bold text-[#091828]">Quiz Results</span>
                        </div>
                    </div>
                    <div className="size-12 shrink-0"/>
                </header>
                <div className="mt-8" style={{transform:"rotate(-1.5deg)"}}>
                    <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-6 text-center shadow-[4px_4px_0_#091828]">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFD9E1]">
                            <PartyPopper className="size-7 text-[#AC2A5D]"/>
                        </div>
                        <p className="mt-4 text-4xl font-extrabold text-[#091828]">{result.score}<span className="text-[#6b6375]">/{result.totalQuestions}</span></p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#6b6375]">Correct answers</p>
                        {hadRequeues&&(
                            <p className="mt-2 text-xs text-[#6b6375]">It took {result.answeredAttempts} attempts to get there, nice persistence!</p>
                        )}
                        <p className="mt-3 text-sm font-semibold text-[#091828]">{completionMessage}</p>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-3">
                    <XpPill amount={result.reward.xp} earned/>
                    <XpPill
                        amount={result.reward.coins}
                        earned
                        label={`+${result.reward.coins} Coins`}
                    />
                </div>
                <div className="mt-6 flex flex-col items-center">
                    {result.knowledgeStreak.advanced?(
                        <div className="flex items-center gap-4">
                            <StreakFlame
                                days={result.knowledgeStreak.previous}
                                label="was"
                                size="sm"
                            />
                            <ArrowRight className="size-5 text-[#6b6375]"/>
                            <StreakFlame
                                days={result.knowledgeStreak.current}
                                size="md"
                            />
                        </div>
                    ):(
                        <StreakFlame
                            days={result.knowledgeStreak.current}
                            size="md"
                        />
                    )}
                    {result.knowledgeStreak.advanced&&(
                        <p className="mt-2 text-sm font-bold text-[#AC2A5D]">Your streak went up! 🔥</p>
                    )}
                </div>
                <div className="mt-8 flex flex-col gap-3">
                    <Link
                        to="/quests"
                        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#091828] px-6 py-4 text-base font-extrabold text-white shadow-[4px_4px_0_#091828] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                    >
                        Back to Quests
                    </Link>
                    <Link
                        to="/"
                        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-white px-6 py-4 text-base font-extrabold text-[#091828] shadow-[4px_4px_0_#091828] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                    >
                        View Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}

function QuizResultsSkeleton(){
    return(
        <div className="min-h-screen bg-[#F4FBF7] pb-16">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <div className="flex items-center gap-3">
                    <div className="size-12 shrink-0 animate-pulse rounded-full bg-[#DCEFE8]"/>
                    <div className="h-10 flex-1 animate-pulse rounded-full bg-[#DCEFE8]"/>
                    <div className="size-12 shrink-0"/>
                </div>
                <div className="mt-8 h-56 animate-pulse rounded-3xl bg-[#DCEFE8]"/>
                <div className="mt-4 h-10 animate-pulse rounded-full bg-[#DCEFE8]"/>
                <div className="mt-6 h-32 animate-pulse rounded-full bg-[#DCEFE8]"/>
            </div>
        </div>
    )
}

function QuizResultsError({
    message,
    onRetry,
}:{
    message:string
    onRetry?:()=>void
}){
    return(
        <div className="flex min-h-screen items-center justify-center bg-[#F4FBF7] px-5">
            <div className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white px-6 py-8 text-center shadow-[4px_4px_0_#091828]">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFD9E1]">
                    <AlertTriangle className="size-6 text-[#AC2A5D]"/>
                </div>
                <h1 className="mt-4 text-xl font-extrabold text-[#091828]">Results unavailable</h1>
                <p className="mt-2 text-sm text-[#6b6375]">{message}</p>
                {onRetry&&(
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#091828] px-6 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_#091828]"
                    >
                        Retry
                    </button>
                )}
                <Link
                    to="/quests"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-white px-6 py-3 text-sm font-extrabold text-[#091828] shadow-[4px_4px_0_#091828]"
                >
                    Back to Quests
                </Link>
            </div>
        </div>
    )
}

function formatTopicName(topic:QuizTopic){
    return topic
        .toLowerCase()
        .split("_")
        .map((word)=>word.charAt(0).toUpperCase()+word.slice(1))
        .join(" ")
}