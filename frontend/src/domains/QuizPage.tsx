import {Link,useNavigate,useParams} from "react-router-dom"
import {LongButton} from "@/components/common/LongButton"
import {getDailyQuiz,getQuizTopic,getQuizTopics} from "@/features/quiz/quizApi"
import type {DailyQuizState,QuizSessionType,QuizTopic,QuizTopicDetail} from "@/features/quiz/quizTypes"
import {useQuizSession} from "@/hooks/useQuizSession"
import {useCallback,useEffect,useState} from "react"

function isAbortError(error:unknown){
    return error instanceof Error && error.name==="AbortError"
}

const QUIZ_TOPICS:QuizTopic[]=[
    "BUDGETING",
    "CREDIT_SCORE",
    "INTEREST",
    "DEBT",
    "BNPL",
    "SUBSCRIPTIONS",
]

function isQuizTopic(value:string|undefined):value is QuizTopic{
    return value!==undefined && QUIZ_TOPICS.includes(value as QuizTopic)
}

type QuizEntryData=|{
        type:"DAILY"
        value:DailyQuizState
    }|{
        type:"TOPIC"
        value:QuizTopicDetail
        rewardPreview:{
            xp:number
            coins:number
        }|null
    }

function useQuizEntryData(
    quizType:QuizSessionType,
    topic:QuizTopic|null
){
    const [data,setData]=useState<QuizEntryData|null>(null)
    const [loading,setLoading]=useState(true)
    const [error,setError]=useState<string|null>(null)
    const load=useCallback(async(signal?:AbortSignal)=>{
        setLoading(true)
        setError(null)
        setData(null)
        try{
            if(quizType==="DAILY"){
                const res=await getDailyQuiz({signal})
                setData({
                    type:"DAILY",
                    value:res,
                })
                return
            }
            if(!topic){
                setError("This quiz topic is invalid.")
                return
            }
            const [topicDetail,topics]=await Promise.all([
                getQuizTopic(topic,{signal}),
                getQuizTopics({signal}),
            ])
            const topicSummary=topics.find(item=>item.key===topic)
            setData({
                type:"TOPIC",
                value:topicDetail,
                rewardPreview:topicSummary?.rewardPreview??null,
            })
        }catch(err){
            if(isAbortError(err)){
                return
            }
            setError(err instanceof Error?err.message:"Failed to load quiz information.")
        }finally{
            if(!signal?.aborted){
                setLoading(false)
            }
        }
    },[quizType,topic])
    useEffect(()=>{
        const controller=new AbortController()
        load(controller.signal)
        return ()=>{
            controller.abort()
        }
    },[load])
    return {
        data,
        loading,
        error,
        reload:()=>load(),
    }
}

export default function QuizPage(){
    const navigate=useNavigate()
    const {topic:topicParam}=useParams<{topic?:string}>()
    const normalisedTopic=topicParam?.toUpperCase()
    const topic=isQuizTopic(normalisedTopic)?normalisedTopic:null
    const quizType:QuizSessionType=topicParam?"TOPIC":"DAILY"
    const {data,loading,error,reload,}=useQuizEntryData(quizType,topic)
    const {startDailyQuiz,startTopicQuiz,isLoading:starting,error:startError,clearError,}=useQuizSession()
    const handleStartOrResume=async()=>{
        clearError()
        const session=quizType==="DAILY"?await startDailyQuiz():topic?await startTopicQuiz(topic):null
        if(session){
            navigate(`/quiz/session/${session.id}`)
        }
    }
    if(loading){
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
                <p className="max-w-xs text-sm text-[#6b6375]">
                    Loading {quizType==="DAILY"?"today's quiz":"topic quiz"}...
                </p>
            </div>
        )
    }
    if(error){
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
                <p className="max-w-xs text-sm text-[#6b6375]">
                    {error}
                </p>
                <LongButton  LongVariant="primaryPinkBorder"  LongSize="md"  showArrow={false} onClick={reload}>
                    Retry
                </LongButton>
                <LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
                    <Link to="/quests">Back to Quests</Link>
                </LongButton>
            </div>
        )
    }
    if(!data){
        return null
    }
    if(data.type==="TOPIC"){
        const topicData=data.value
        const rewardPreview=data.rewardPreview
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
                <h1 className="text-2xl font-extrabold text-[#091828]">
                    {topicData.name}
                </h1>
                <p className="text-sm font-medium text-[#091828]"> Quiz type: Topic</p>
                <p className="max-w-xs text-sm text-[#6b6375]">{topicData.description}</p>
                <p className="text-sm text-[#6b6375]">
                    {topicData.questionCount} questions
                    {rewardPreview && (
                        <>
                            {" • +"}{rewardPreview.xp} XP
                            {" • +"}{rewardPreview.coins} coins
                        </>
                    )}
                </p>
                {!topicData.available && (
                    <p className="text-sm text-[#6b6375]">This topic quiz is not available yet.</p>
                )}
                {startError && (
                    <p className="text-sm text-red-500">{startError}</p>
                )}
                <LongButton LongVariant="primaryPinkBorder" LongSize="md" showArrow={false} onClick={handleStartOrResume} disabled={starting||!topicData.available}>
                    {starting?"Starting...":"Start topic quiz"}
                </LongButton>
                <LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
                    <Link to="/quests">Back to Quests</Link>
                </LongButton>
            </div>
        )
    }
    const dailyData=data.value
    if(dailyData.status==="COMPLETED"){
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
                <h1 className="text-2xl font-extrabold text-[#091828]">
                    Financial Quiz
                </h1>
                <p className="text-sm font-medium text-[#091828]">Quiz type: Daily</p>
                <p className="max-w-xs text-sm text-[#6b6375]">You have already completed today's quiz. Come back tomorrow!</p>
                <p className="text-sm text-[#6b6375]">You earned {dailyData.reward.xp} XP and {dailyData.reward.coins} coins.</p>
                <LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
                    <Link to="/quests">Back to Quests</Link>
                </LongButton>
            </div>
        )
    }
    const inProgress=dailyData.status==="IN_PROGRESS"
    const questionCount=dailyData.status==="IN_PROGRESS"?dailyData.session.progress.initialQuestions:5
    const rewardPreview=dailyData.rewardPreview
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
            <h1 className="text-2xl font-extrabold text-[#091828]">
                Financial Quiz
            </h1>
            <p className="max-w-xs text-sm text-[#6b6375]">Test your money smarts and earn coins!</p>
            <p className="text-sm font-medium text-[#091828]"> Quiz type: Daily</p>
            <p className="text-sm text-[#6b6375]">
                {questionCount} questions
                {" • +"}{rewardPreview.xp} XP
                {" • +"}{rewardPreview.coins} coins
            </p>
            {dailyData.status==="AVAILABLE" && (
                <p className="text-sm text-[#6b6375]">
                    Knowledge streak: {dailyData.knowledgeStreak.current}
                    {" "}(best {dailyData.knowledgeStreak.longest})
                </p>
            )}
            {dailyData.status==="IN_PROGRESS" && (
                <p className="text-sm text-[#6b6375]">
                    In progress - {dailyData.session.progress.answeredAttempts} of{" "}
                    {dailyData.session.progress.initialQuestions} answered so far.
                </p>
            )}
            {startError && (
                <p className="text-sm text-red-500">{startError}</p>
            )}
            <LongButton LongVariant="primaryPinkBorder" LongSize="md" showArrow={false} onClick={handleStartOrResume} disabled={starting}>
                {starting?inProgress?"Resuming...":"Starting...":inProgress?"Resume daily quiz":"Start daily quiz"}
            </LongButton>
            <LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
                <Link to="/quests">Back to Quests</Link>
            </LongButton>
        </div>
    )
}