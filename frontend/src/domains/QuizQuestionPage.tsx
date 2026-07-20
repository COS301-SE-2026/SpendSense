import {useCallback,useEffect,useMemo,useState} from "react"
import {useNavigate,useParams} from "react-router-dom"
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    RefreshCw,
} from "lucide-react"
import {LongButton} from "@/components/common/LongButton"
import {CustomCard} from "@/components/ui/CustomCard"
import {cn} from "@/lib/utils"
import {useQuizSession} from "@/hooks/useQuizSession"

export default function QuizQuestionPage(){
    const navigate=useNavigate()
    const {sessionId}=useParams<{sessionId:string}>()
    const [selectedOptionKey,setSelectedOptionKey]=useState<string|null>(null)
    const [hasSubmitted,setHasSubmitted]=useState(false)
    const {
        session,
        currentQuestion,
        isLoading,
        isSubmitting,
        error,
        resumeSession,
        answerQuestion,
        clearError,
    }=useQuizSession()
    useEffect(()=>{
        if(!sessionId){
            return
        }
        void resumeSession(sessionId)
    },[sessionId,resumeSession])

    const questionNumber=useMemo(()=>{
        if(!session){
            return 1
        }
        return Math.min(
            session.progress.correct+1,
            session.progress.initialQuestions
        )
    },[session])
    const progressPercentage=useMemo(()=>{
        if(!session||session.progress.initialQuestions===0){
            return 0
        }
        return Math.min(
            100,
            (session.progress.correct/session.progress.initialQuestions)*100
        )
    },[session])
    const handleBack=useCallback(()=>{
        navigate("/quests")
    },[navigate])
    const handleSelect=useCallback((optionKey:string)=>{
        if(isSubmitting||hasSubmitted){
            return
        }
        clearError()
        setSelectedOptionKey(optionKey)
    },[clearError,hasSubmitted,isSubmitting])
    const handleSubmit=useCallback(async()=>{
        if(!sessionId||!currentQuestion||!selectedOptionKey||isSubmitting||hasSubmitted){
            return
        }
        clearError()
        setHasSubmitted(true)
        const response=await answerQuestion({
            questionId:currentQuestion.id,
            selectedOptionKey,
        })
        if(!response){
            setHasSubmitted(false)
            return
        }
        navigate(`/quiz/sessions/${sessionId}/feedback`)
    },[
        answerQuestion,
        clearError,
        currentQuestion,
        hasSubmitted,
        isSubmitting,
        navigate,
        selectedOptionKey,
        sessionId,
    ])
    if(!sessionId){
        return(
            <QuizQuestionError
                message="This quiz session is invalid."
                onRetry={handleBack}
                retryLabel="Back to Quests"
            />
        )
    }
    if(isLoading){
        return <QuizQuestionSkeleton/>
    }
    if(error&&!session){
        return(
            <QuizQuestionError
                message={error}
                onRetry={()=>void resumeSession(sessionId)}
                retryLabel="Retry"
            />
        )
    }

    if(!session){
        return(
            <QuizQuestionError
                message="We could not find this quiz session."
                onRetry={handleBack}
                retryLabel="Back to Quests"
            />
        )
    }
    if(session.status==="COMPLETED"||session.result){
        return(
            <QuizQuestionError
                message="This quiz has already been completed."
                onRetry={()=>navigate(`/quiz/sessions/${sessionId}/results`)}
                retryLabel="View Results"
            />
        )
    }
    if(!currentQuestion){
        return(
            <QuizQuestionError
                message="There is no question available for this session."
                onRetry={()=>void resumeSession(sessionId)}
                retryLabel="Reload Quiz"
            />
        )
    }
    const interactionDisabled=isSubmitting||hasSubmitted
    return(
        <div className="min-h-screen bg-[#F4FBF7] pb-10">
            <main className="mx-auto w-full max-w-md px-5 pt-6">
                <header>
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center gap-1 text-sm font-semibold text-[#6b6375] transition hover:text-[#091828]"
                    >
                        <ArrowLeft className="size-4"/>
                        Exit quiz
                    </button>
                    <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#AC2A5D]">{formatTopicName(currentQuestion.topic)}</p>
                            <h1 className="mt-1 text-2xl font-extrabold text-[#091828]">
                                Question {questionNumber} of{" "}
                                {session.progress.initialQuestions}
                            </h1>
                        </div>
                        <div className="rounded-full bg-[#FFD9E1] px-3 py-1.5 text-xs font-bold text-[#AC2A5D]">
                            {session.progress.correct} correct
                        </div>
                    </div>
                    <div
                        className="mt-4 h-3 overflow-hidden rounded-full bg-[#DCEFE8]"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={session.progress.initialQuestions}
                        aria-valuenow={session.progress.correct}
                        aria-label={`${session.progress.correct} of ${session.progress.initialQuestions} questions completed`}
                    >
                        <div
                            className="h-full rounded-full bg-[#6FC9B0] transition-[width] duration-300"
                            style={{width:`${progressPercentage}%`}}
                        />
                    </div>
                </header>
                <CustomCard
                    variant="greenShaddow"
                    size="sm"
                    className="mt-6"
                >
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6b6375]">Choose the best answer</p>
                    <h2 className="mt-2 text-xl font-extrabold leading-snug text-[#091828]">{currentQuestion.prompt}</h2>
                </CustomCard>
                <fieldset
                    disabled={interactionDisabled}
                    className="mt-5 space-y-3"
                    aria-label="Answer options"
                >
                    <legend className="sr-only">Select one answer</legend>
                    {currentQuestion.options.map((option)=>{
                        const isSelected=selectedOptionKey===option.key
                        return(
                            <button
                                key={option.key}
                                type="button"
                                onClick={()=>handleSelect(option.key)}
                                disabled={interactionDisabled}
                                aria-pressed={isSelected}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-2xl border-2 bg-white px-4 py-4 text-left shadow-sm transition",
                                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD9E1]",
                                    isSelected?"border-[#AC2A5D] bg-[#FFF4F7]":"border-transparent hover:border-[#D6EEE8]",
                                    interactionDisabled?"cursor-not-allowed":"active:scale-[0.99]"
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold",
                                        isSelected?"border-[#AC2A5D] bg-[#AC2A5D] text-white":"border-[#B8CBBF] bg-[#F4FBF7] text-[#091828]"
                                    )}
                                >
                                    {isSelected?(
                                        <Check className="size-5"/>
                                    ):(
                                        option.key
                                    )}
                                </span>
                                <span className="flex-1 text-sm font-semibold leading-relaxed text-[#091828]">{option.text}</span>
                            </button>
                        )
                    })}
                </fieldset>
                {error&&session&&(
                    <div className="mt-4 flex items-start gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFD9E1] px-4 py-3">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#AC2A5D]"/>
                        <p className="flex-1 text-sm font-semibold text-[#AC2A5D]">{error}</p>
                    </div>
                )}
                <LongButton
                    LongVariant="primaryDark"
                    LongSize="sm"
                    className="mt-6"
                    showArrow={false}
                    disabled={!selectedOptionKey||isSubmitting||hasSubmitted}
                    onClick={handleSubmit}
                >
                    {isSubmitting||hasSubmitted?"Checking answer...":"Submit Answer"}
                </LongButton>
                <p className="mt-3 text-center text-xs leading-relaxed text-[#6b6375]">Incorrect answers may return later so you can try them again.</p>
            </main>
        </div>
    )
}

function QuizQuestionSkeleton(){
    return(
        <div className="min-h-screen bg-[#F4FBF7]">
            <main className="mx-auto w-full max-w-md px-5 pt-6">
                <div className="h-5 w-20 animate-pulse rounded bg-[#DCEFE8]"/>
                <div className="mt-6 h-8 w-2/3 animate-pulse rounded bg-[#DCEFE8]"/>
                <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-[#DCEFE8]"/>
                <CustomCard
                    variant="greenShaddow"
                    size="sm"
                    className="mt-6 space-y-3"
                >
                    <div className="h-3 w-32 animate-pulse rounded bg-[#DCEFE8]"/>
                    <div className="h-6 w-full animate-pulse rounded bg-[#DCEFE8]"/>
                    <div className="h-6 w-4/5 animate-pulse rounded bg-[#DCEFE8]"/>
                </CustomCard>
                <div className="mt-5 space-y-3">
                    {[1,2,3,4].map((item)=>(
                        <div
                            key={item}
                            className="h-20 animate-pulse rounded-2xl bg-white shadow-sm"
                        />
                    ))}
                </div>
            </main>
        </div>
    )
}

function QuizQuestionError({
    message,
    onRetry,
    retryLabel,
}:{
    message:string
    onRetry:()=>void
    retryLabel:string
}){
    return(
        <div className="flex min-h-screen items-center justify-center bg-[#F4FBF7] px-5">
            <CustomCard
                variant="greenShaddow"
                size="sm"
                className="w-full max-w-md text-center"
            >
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#FFD9E1]"><AlertTriangle className="size-6 text-[#AC2A5D]"/></div>
                <h1 className="mt-4 text-xl font-extrabold text-[#091828]">Quiz unavailable</h1>
                <p className="mt-2 text-sm text-[#6b6375]">{message}</p>
                <LongButton
                    LongVariant="primaryDark"
                    LongSize="sm"
                    className="mt-5"
                    showArrow={false}
                    onClick={onRetry}
                >
                    <RefreshCw className="mr-2 size-4"/>
                    {retryLabel}
                </LongButton>
            </CustomCard>
        </div>
    )
}

function formatTopicName(topic:string){
    return topic
        .toLowerCase()
        .split("_")
        .map((word)=>word.charAt(0).toUpperCase()+word.slice(1))
        .join(" ")
}