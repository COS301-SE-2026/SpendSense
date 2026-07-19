import {useNavigate} from "react-router-dom"
import {cn} from "@/lib/utils"
import {ChevronLeft,PiggyBank,CreditCard,TrendingUp,AlertTriangle,ShoppingBag,RefreshCw,Lock,HelpCircle,BookOpen,ChevronRight,} from "lucide-react"
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
            if(isAbortError(err)) return
            setError(err instanceof Error?err.message:"Failed to load quiz topics.")
        }finally{
            if(!signal?.aborted) setLoading(false)
        }
    },[])
    useEffect(()=>{
        const controller=new AbortController()
        load(controller.signal)
        return ()=>controller.abort()
    },[load])
    return {topics,loading,error,reload:()=>load()}
}

function TopicCard({topic,onPress}:{topic:QuizTopicSummary;onPress:()=>void}){
    const config=TOPIC_ICON[topic.key]??{icon:HelpCircle,bg:"bg-[#E3EAE6]",iconColor:"text-[#6b6375]"}
    const Icon=config.icon
    return(
        <button
            type="button"
            onClick={topic.available?onPress:undefined}
            disabled={!topic.available}
            aria-label={topic.available?`${topic.name} quiz`:`${topic.name} locked`}
            className={cn(
                "group flex w-full items-center gap-3 rounded-2xl border-2 border-[#091828] bg-white p-3 text-left shadow-[4px_4px_0_#091828] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#091828]",
                topic.available?"hover:-translate-y-0.5":"cursor-not-allowed opacity-50"
            )}
        >
            {topic.available?(
                <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full",config.bg)}>
                    <Icon className={config.iconColor} size={26}/>
                </div>
            ):(
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#B8CBBF] bg-[#F4FBF7]">
                    <Lock size={20} className="text-[#91A99C]"/>
                </div>
            )}
            <div className="min-w-0 flex-1 self-stretch py-0.5">
                <p className="text-base font-extrabold leading-tight tracking-tight text-[#091828]">{topic.name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6b6375]">{topic.description}</p>
                <div className="mt-3 flex min-h-4 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#6b6375]">
                    {topic.available?(
                        <>
                            <span className="inline-flex items-center gap-1 text-[#091828]"><BookOpen size={13} className="text-[#AC2A5D]"/> {topic.questionCount} questions</span>
                            {topic.rewardPreview&&(
                                <span className="text-[#AC2A5D]">
                                    +{topic.rewardPreview.xp} XP <span className="text-[#A36B00]">· +{topic.rewardPreview.coins} coins</span>
                                </span>
                            )}
                        </>
                    ):<span className="font-semibold text-[#91A99C]">Coming soon</span>}
                </div>
            </div>
            {topic.available&&<ChevronRight className="size-5 shrink-0 text-[#AC2A5D]"/>}
        </button>
    )
}

function TopicCardSkeleton(){
    return(
        <div className="rounded-2xl border-2 border-[#DCEFE8] bg-white p-3 shadow-[4px_4px_0_#DCEFE8]">
            <div className="flex items-center gap-4">
                <div className="size-14 shrink-0 animate-pulse rounded-full bg-[#DCEFE8]"/>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-[#DCEFE8]"/>
                    <div className="h-3 w-4/5 animate-pulse rounded bg-[#DCEFE8]"/>
                    <div className="h-3 w-2/5 animate-pulse rounded bg-[#DCEFE8]"/>
                </div>
            </div>
        </div>
    )
}

export default function TopicQuizPage(){
    const navigate=useNavigate()
    const {topics,loading,error,reload}=useQuizTopics()
    return(
        <div className="min-h-screen bg-[#F4FBF7] pb-24">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={()=>navigate("/quests")}
                        aria-label="Go back"
                        className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828]"
                    >
                        <ChevronLeft className="size-5 text-[#6E0034]"/>
                    </button>
                    <div className="flex flex-1 items-center justify-center">
                        <div className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828]" style={{transform:"rotate(-3deg)"}}>
                            <h1 className="text-base font-bold text-[#091828]">Quiz Topics</h1>
                        </div>
                    </div>
                    <div className="size-12 shrink-0" aria-hidden="true"/>
                </header>

                <main className="mt-8 space-y-6">
                    <section className="rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-5 py-5 shadow-[4px_4px_0_#091828]">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#AC2A5D]">Financial learning</p>
                        <h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#091828]">Pick a Topic</h2>
                        <p className="mt-1 text-sm leading-relaxed text-[#6b6375]">Test your money smarts on a subject of your choice.</p>
                    </section>

                    {error&&(
                        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFF1F4] px-4 py-3">
                            <AlertTriangle className="size-4 shrink-0 text-[#AC2A5D]"/>
                            <p className="flex-1 text-sm font-semibold text-[#AC2A5D]">{error}</p>
                        </div>
                    )}

                    {loading?(
                        <div className="space-y-4 px-2">{[1,2,3,4,5,6].map(n=><TopicCardSkeleton key={n}/>)}</div>
                    ):(
                        <div className="space-y-4 px-2">{topics?.map(topic=><TopicCard key={topic.key} topic={topic} onPress={()=>navigate(`/quiz/topics/${topic.key}`)}/>)}</div>
                    )}

                    {!loading&&!error&&topics?.length===0&&(
                        <p className="text-center text-sm text-[#6b6375]">No quiz topics available right now.</p>
                    )}
                    {!loading&&error&&(
                        <button type="button" onClick={reload} className="w-full rounded-2xl border-2 border-[#AC2A5D] bg-white px-4 py-3 text-sm font-bold text-[#AC2A5D] shadow-[3px_3px_0_#AC2A5D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                            Retry
                        </button>
                    )}
                </main>
            </div>
        </div>
    )
}
