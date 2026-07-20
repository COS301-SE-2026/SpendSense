import {useEffect} from "react"
import {Link,useLocation,useNavigate,useParams} from "react-router-dom"
import {AlertTriangle,ArrowRight,Check,RotateCcw,Trophy,X,} from "lucide-react"
import type {QuizAnswerFeedback,QuizQuestion,QuizSessionResult} from "@/features/quiz/quizTypes"

interface QuizFeedbackLocationState{
    feedback:QuizAnswerFeedback
    nextQuestion:QuizQuestion|null
    result:QuizSessionResult|null
}

function isQuizFeedbackLocationState(value:unknown):value is QuizFeedbackLocationState{
    return(
        typeof value==="object"&&
        value!==null&&
        "feedback" in value&&
        typeof (value as {feedback:unknown}).feedback==="object"&&
        (value as {feedback:unknown}).feedback!==null
    )
}

export default function QuizAnswerFeedbackPage(){
    const navigate=useNavigate()
    const location=useLocation()
    const {sessionId}=useParams<{sessionId:string}>()
    const state=isQuizFeedbackLocationState(location.state)?location.state:null
    useEffect(()=>{
        if(state||!sessionId){
            return
        }
        navigate(`/quiz/sessions/${sessionId}`,{replace:true})
    },[navigate,sessionId,state])
    if(!sessionId){
        return <QuizFeedbackError message="This quiz session is invalid."/>
    }
    if(!state){
        return null
    }
    const {feedback,result}=state
    const isCorrect=feedback.isCorrect
    const isFinished=result!==null
    const handleContinue=()=>{
        if(isFinished){
            navigate(`/quiz/sessions/${sessionId}/results`,{
                replace:true,
                state:{result},
            })
            return
        }
        navigate(`/quiz/sessions/${sessionId}`,{replace:true})
    }
    const resultColor=isCorrect?"#6FC9B0":"#AC2A5D"
    const resultBg=isCorrect?"#DCEFE8":"#FFD9E1"
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
                            <span className="text-base font-bold text-[#091828]">
                                {isCorrect?"Nice one!":"Answer Feedback"}
                            </span>
                        </div>
                    </div>
                    <div className="size-12 shrink-0"/>
                </header>
                <div className="mt-8" style={{transform:"rotate(-1.5deg)"}}>
                    <div
                        className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-6 text-center shadow-[4px_4px_0_#091828]"
                    >
                        <div
                            className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-[#091828]"
                            style={{backgroundColor:resultBg}}
                        >
                            {isCorrect?(
                                <Check className="size-7 text-[#0E7A5F]" strokeWidth={3}/>
                            ):(
                                <X className="size-7 text-[#AC2A5D]" strokeWidth={3}/>
                            )}
                        </div>
                        <h1
                            className="mt-4 text-2xl font-extrabold"
                            style={{color:resultColor}}
                        >
                            {isCorrect?"Correct!":"Not quite"}
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-[#6b6375]">{feedback.explanation}</p>
                    </div>
                </div>
                {!isCorrect&&feedback.requeued&&(
                    <div className="mt-4" style={{transform:"rotate(1deg)"}}>
                        <div className="flex items-start gap-2 rounded-2xl border-2 border-[#091828] bg-[#FFF6DD] px-4 py-3 shadow-[2px_2px_0_#091828]">
                            <RotateCcw className="mt-0.5 size-4 shrink-0 text-[#8A6D00]"/>
                            <p className="flex-1 text-sm font-semibold text-[#8A6D00]">This question will come back later in the quiz so you can try it again.</p>
                        </div>
                    </div>
                )}
                {isFinished&&result&&(
                    <div className="mt-4">
                        <div className="rounded-3xl border-2 border-[#091828] bg-[#FFD9E1] px-5 py-4 text-center shadow-[4px_4px_0_#091828]">
                            <div className="mx-auto flex size-12 items-center justify-center rounded-full border-2 border-[#091828] bg-white">
                                <Trophy className="size-5 text-[#AC2A5D]"/>
                            </div>
                            <p className="mt-3 text-sm font-bold text-[#091828]">
                                Quiz complete — {result.score} of {result.totalQuestions} correct
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#6E0034]">See your full results and rewards next.</p>
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={handleContinue}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#091828] px-6 py-4 text-base font-extrabold text-white shadow-[4px_4px_0_#091828] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                >
                    {isFinished?"View Results":"Next Question"}
                    <ArrowRight className="size-4"/>
                </button>
            </div>
        </div>
    )
}

function QuizFeedbackError({message}:{message:string}){
    return(
        <div className="flex min-h-screen items-center justify-center bg-[#F4FBF7] px-5">
            <div className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white px-6 py-8 text-center shadow-[4px_4px_0_#091828]">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFD9E1]">
                    <AlertTriangle className="size-6 text-[#AC2A5D]"/>
                </div>
                <h1 className="mt-4 text-xl font-extrabold text-[#091828]">Quiz unavailable</h1>
                <p className="mt-2 text-sm text-[#6b6375]">{message}</p>
                <Link
                    to="/quests"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#091828] px-6 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_#091828]"
                >
                    Back to Quests
                </Link>
            </div>
        </div>
    )
}