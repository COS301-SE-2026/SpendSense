import {Link,useNavigate} from "react-router-dom"
import {LongButton} from "@/components/common/LongButton"
import { getDailyQuiz } from "@/features/quiz/quizApi"
import type { DailyQuizState } from "@/features/quiz/quizTypes"
import { useQuizSession } from "@/hooks/useQuizSession"
import { useCallback,useEffect,useState } from "react"

function isAbortError(error:unknown){
    return error instanceof Error && error.name==='AbortError';
}

//screen needs the daily quiz status before any session can exist therefore seperated it form QuizPafge
function useDailyQuizStatus(){
    const [data,setData]=useState<DailyQuizState|null>(null);
    const [loading,setLoading]=useState(true);
    const[error,setError]=useState<string|null>(null);
    const load=useCallback(async(signal?:AbortSignal)=>{
        setLoading(true);
        setError(null);
        try{
            const res=await getDailyQuiz({signal});
            setData(res);
        }catch(err){
            if(isAbortError(err)){
                return;
            }
            setError(err instanceof Error?err.message:"Failed to load quiz status.");
        }finally{
            setLoading(false);
        }
    },[]);
    useEffect(()=>{
        const controller=new AbortController();
        load(controller.signal);
        return ()=>controller.abort();
    },[load]);
    return {data,loading,error,reload:()=>load()};
}

export default function QuizPage() {
    const navigate=useNavigate();
    const {data,loading,error,reload}=useDailyQuizStatus();
    const {startDailyQuiz,isLoading:starting,error:startError,clearError}=useQuizSession();
    const handleStartOrResume=async()=>{
        clearError();
        const session=await startDailyQuiz();
        if(session){
            navigate(`/quiz/sessions/${session.id}`);
        }
    };
    if(loading){
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
                <p className="max-w-xs text-sm text-[#6b6375]">Loading today's quiz...</p>
            </div>
        );
    }
    if(error){
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
                <p className="max-w-xs text-sm text-[#6b6375]">We couldn't load the quiz right now.</p>
                <LongButton LongVariant="primaryPinkBorder" LongSize="md" showArrow={false} onClick={reload}>Retry</LongButton>
                <LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
                    <Link to="/quests">Back to Quests</Link>
                </LongButton>
            </div>
        );
    }

    if(!data){
        return null;
    }

    if(data.status==="COMPLETED"){
        return (
            <div className ="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
                <h1 className = "text-2xl font entrabold text-[#091828]">Financial Quiz</h1>
                <p className = "max-w-xs text-sm text-[#6b6375]">You have already completed todays quiz. Come back tomorrow!</p>
                <p className="text-sm text-[#6b6375]">You earned {data.reward.xp} XP and {data.reward.coins} coins.</p>
                <LongButton LongVariant = "outline" LongSize ="md" showArrow={false} asChild>
                    <Link to="/quests">Back to Quests</Link>
                </LongButton>
            </div>
        )
    }

    //avail or in progress
    const inProgress=data?.status==="IN_PROGRESS";
    const questionCount=data?.status==="IN_PROGRESS"?data.session.progress.initialQuestions:5;
    const rewardPreview=data.rewardPreview;

    return (
        <div className ="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
            <h1 className = "text-2xl font entrabold text-[#091828]">Financial Quiz</h1>
            <p className = "max-w-xs text-sm text-[#6b6375]">Test your money smarts and earn coins!</p>
            <p className="text-sm text-[#6b6375]">
                Daily quiz - {questionCount} questions
                {rewardPreview && (
                    <>
                        - + {rewardPreview.xp} XP
                        - + {rewardPreview.coins} coins
                    </>
                )}
            </p>
            {data?.status==="AVAILABLE" && (
                <p className="text-sm text-[#6b6375]"> Knowledge streak: {data.knowledgeStreak.current} (best {data.knowledgeStreak.longest})</p>
            )}
            {inProgress && data?.status==="IN_PROGRESS" && (
                <p className="text-sm text-[#6b6375]">In progress - {data.session.progress.answeredAttempts} of {data.session.progress.initialQuestions} answered so far.</p>
            )}
            {startError && <p className="text-sm text-red-500">{startError}</p>}
            <LongButton LongVariant="primaryPinkBorder" LongSize="md" showArrow={false} onClick={handleStartOrResume} disabled={starting}>
                {starting?"Starting...":inProgress?"Resume quiz":"Start quiz"}
            </LongButton>
            <LongButton LongVariant = "outline" LongSize ="md" showArrow={false} asChild>
                <Link to="/quests">Back to Quests</Link>
            </LongButton>
            </div>
    )
}