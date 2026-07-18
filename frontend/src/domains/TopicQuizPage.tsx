import {useNavigate} from "react-router-dom"
import {cn} from "@/lib/utils"
import {ArrowLeft,PiggyBank,CreditCard,TrendingUp,AlertTriangle,ShoppingBag,RefreshCw,Lock,ChevronRight,HelpCircle,} from "lucide-react"
import {getQuizTopics} from "@/features/quiz/quizApi"
import type {QuizTopic,QuizTopicSummary} from "@/features/quiz/quizTypes"
import {useCallback,useEffect,useState} from "react"

function isAbortError(error:unknown){
    return error instanceof Error && error.name==="AbortError"
}

const TOPIC_ICON:Record<QuizTopic,{icon:typeof PiggyBank;bg:string;iconColor:string}>={
    BUDGETING:{icon:PiggyBank,bg:"bg-[#D6EEE8]",iconColor:"text-[#0D9488]"},
    CREDIT_SCORE:{icon:TrendingUp,bg:"bg-[#E8D5F5]",iconColor:"text-[#7C3AED]"},
    INTEREST:{icon:CreditCard,bg:"bg-[#DCE8F7]",iconColor:"text-[#1E4FAE]"},
    DEBT:{icon:AlertTriangle,bg:"bg-[#FFD9E1]",iconColor:"text-[#AC2A5D]"},
    BNPL:{icon:ShoppingBag,bg:"bg-[#FFE7AE]",iconColor:"text-[#7A4A00]"},
    SUBSCRIPTIONS:{icon:RefreshCw,bg:"bg-[#DCEFE8]",iconColor:"text-[#16635A]"},
}

function useQuizTopics(){
    const [topics,setTopics]=useState<QuizTopicSummary[]|null>(null)
    const [loading,setLoading]=useState(true)
    const [error,setError]=useState<string|null>(null)
    const load=useCallback(async(signal?:AbortSignal)=>{
        setLoading(true)
        setError(null)
        setTopics(null)
        try{
            const res=await getQuizTopics({signal})
            setTopics(res)
        }catch(err){
            if(isAbortError(err)){
                return
            }
            setError(err instanceof Error?err.message:"Failed to load quiz topics.")
        }finally{
            if(!signal?.aborted){
                setLoading(false)
            }
        }
    },[])
    useEffect(()=>{
        const controller=new AbortController()
        load(controller.signal)
        return ()=>{
            controller.abort()
        }
    },[load])
    return {topics,loading,error,reload:()=>load()}
}

// topic card
function TopicCard({topic,onPress}:{
    topic:QuizTopicSummary
    onPress:()=>void
}){
    const config=TOPIC_ICON[topic.key] ?? {icon:HelpCircle,bg:"bg-[#DCEFE8]",iconColor:"text-[#6b6375]"}
    const Icon=config.icon
    return(
        <button
            type="button"
            onClick={topic.available?onPress:undefined}
            disabled={!topic.available}
            className={cn(
                "w-full flex items-center gap-4 rounded-2xl bg-white px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.98]",
                !topic.available && "opacity-50 active:scale-100"
            )}
            aria-label={topic.available?`${topic.name} quiz`:`${topic.name} locked`}
        >
            {topic.available ? (
                <div className={cn("size-14 shrink-0 rounded-full flex items-center justify-center",config.bg)}>
                    <span className={config.iconColor}>
                        <Icon size={26}/>
                    </span>
                </div>
            ):(
                <div className="size-14 shrink-0 rounded-full border-2 border-dashed border-[#B8CBBF] flex items-center justify-center">
                    <Lock size={20} className="text-[#B8CBBF]"/>
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-[#091828]">{topic.name}</p>
                <p className="text-sm text-[#6b6375] line-clamp-2">{topic.description}</p>
                <p className="text-xs font-semibold text-[#6b6375] mt-1">
                    {topic.available?`${topic.questionCount} questions`:"Coming soon"}
                    {topic.available && topic.rewardPreview && (
                        <>
                            {" - +"}{topic.rewardPreview.xp} XP
                            {" - +"}{topic.rewardPreview.coins} coins
                        </>
                    )}
                </p>
            </div>
            {topic.available && (
                <ChevronRight size={20} className="shrink-0 text-[#B8CBBF]"/>
            )}
        </button>
    )
}


// main page
export default function TopicQuizPage(){
    const navigate=useNavigate()
    const {topics,loading,error,reload,}=useQuizTopics()
    return(
        <div className="min-h-screen bg-[#F0F7F4] flex flex-col items-center">
            <div className="w-full max-w-sm flex flex-col min-h-screen">
                {/* header topics */}
                <header className="bg-[#F0F7F4] px-4 pt-5 pb-3 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={()=>navigate("/quests")}
                        className="size-9 flex items-center justify-center rounded-full bg-white/80 text-[#091828] shadow-sm"
                        aria-label="Go back">

                        <ArrowLeft size={20}/>
                    </button>
                    <h1 className="text-base font-bold text-[#091828]">Quiz Topics</h1>
                    <div className="size-9"/>
                </header>
                <main className="flex-1 px-4 pb-24 space-y-6 overflow-y-auto">
                    {error && (
                        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFD9E1] px-4 py-3">
                            <AlertTriangle className="size-4 shrink-0 text-[#AC2A5D]"/>
                            <p className="text-sm font-semibold text-[#AC2A5D]">{error}</p>
                        </div>
                    )}
                    {/* header */}
                    <div className="pt-2 pb-2 text-center space-y-1">
                        <p className="text-2xl font-bold text-[#091828]">Pick a Topic</p>
                        <p className="text-sm text-[#6b6375]">Test your money smarts on a subject of your choice.</p>
                    </div>
                    {/* topics list */}
                    {loading ? (
                        <div className="space-y-4">
                            {[1,2,3,4,5,6].map(n=>(
                                <div key={n} className="h-[88px] w-full rounded-2xl bg-[#D9EDE7] animate-pulse"/>
                            ))}
                        </div>
                    ):(
                        <div className="space-y-4">
                            {topics?.map(topic=>(
                                <TopicCard key={topic.key} topic={topic} onPress={()=>navigate(`/quiz/topics/${topic.key.toLowerCase()}`)}/>
                            ))}
                        </div>
                    )}
                    {!loading && !error && topics?.length===0 && (
                        <p className="text-center text-sm text-[#6b6375]">No quiz topics available right now.</p>
                    )}
                    {!loading && error && (
                        <button type="button" onClick={reload} className="w-full rounded-2xl border-2 border-[#AC2A5D] px-4 py-3 text-sm font-semibold text-[#AC2A5D]">
                            Retry
                        </button>
                    )}
                </main>
            </div>
        </div>
    )
}