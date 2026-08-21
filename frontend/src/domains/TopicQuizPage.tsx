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
    BUDGETING:{icon:PiggyBank,bg:"bg-[#D6EEE8] dark:bg-[#5eead4]/20",iconColor:"text-[#0D9488] dark:text-[#5eead4]"},
    CREDIT_SCORE:{icon:TrendingUp,bg:"bg-[#E8D5F5] dark:bg-[#9B7EDE]/20",iconColor:"text-[#7C3AED] dark:text-[#c5b3f0]"},
    INTEREST:{icon:CreditCard,bg:"bg-[#DCE8F7] dark:bg-[#3D5A80]/30",iconColor:"text-[#1E4FAE] dark:text-[#9dc0ea]"},
    DEBT:{icon:AlertTriangle,bg:"bg-[#FFD9E1] dark:bg-[#ff6b9d]/20",iconColor:"text-[#AC2A5D] dark:text-[#ff6b9d]"},
    BNPL:{icon:ShoppingBag,bg:"bg-[#FFE7AE] dark:bg-[#ffd166]/20",iconColor:"text-[#7A4A00] dark:text-[#ffd166]"},
    SUBSCRIPTIONS:{icon:RefreshCw,bg:"bg-[#DCEFE8] dark:bg-[#5eead4]/15",iconColor:"text-[#16635A] dark:text-[#7fd8c4]"},
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
        void Promise.resolve().then(()=>{
            load(controller.signal)
        })
        return()=>{
            controller.abort()
        }
    },[load])
    return {topics,loading,error,reload:()=>load()}
}

function TopicCard({topic,onPress}:{topic:QuizTopicSummary;onPress:()=>void}){
    const config=TOPIC_ICON[topic.key]??{icon:HelpCircle,bg:"bg-[#E3EAE6] dark:bg-[#1c263c]",iconColor:"text-[#6b6375] dark:text-[#a0aec0]"}
    const Icon=config.icon
    return(
        <button
            type="button"
            onClick={topic.available?onPress:undefined}
            disabled={!topic.available}
            aria-label={topic.available?`${topic.name} quiz`:`${topic.name} locked`}
            className={cn(
                "group flex w-full items-center gap-3 rounded-2xl border-2 border-[#091828] bg-white p-3 text-left shadow-[4px_4px_0_#091828] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20] dark:active:shadow-[2px_2px_0_#060e20]",
                topic.available?"hover:-translate-y-0.5":"cursor-not-allowed opacity-50"
            )}
        >
            {topic.available?(
                <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full",config.bg)}>
                    <Icon className={config.iconColor} size={26}/>
                </div>
            ):(
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#B8CBBF] bg-[#F4FBF7] dark:border-[#a0aec0]/40 dark:bg-[#1c263c]">
                    <Lock size={20} className="text-[#91A99C] dark:text-[#a0aec0]"/>
                </div>
            )}
            <div className="min-w-0 flex-1 self-stretch py-0.5">
                <p className="text-base font-extrabold leading-tight tracking-tight text-[#091828] dark:text-white">{topic.name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6b6375] dark:text-[#a0aec0]">{topic.description}</p>
                <div className="mt-3 flex min-h-4 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#6b6375] dark:text-[#a0aec0]">
                    {topic.available?(
                        <>
                            <span className="inline-flex items-center gap-1 text-[#091828] dark:text-white"><BookOpen size={13} className="text-[#AC2A5D] dark:text-[#ff6b9d]"/> {topic.questionCount} questions</span>
                            {topic.rewardPreview&&(
                                <span className="text-[#AC2A5D] dark:text-[#ff6b9d]">
                                    +{topic.rewardPreview.xp} XP <span className="text-[#A36B00] dark:text-[#ffd166]">· +{topic.rewardPreview.coins} coins</span>
                                </span>
                            )}
                        </>
                    ):<span className="font-semibold text-[#91A99C] dark:text-[#a0aec0]">Coming soon</span>}
                </div>
            </div>
            {topic.available&&<ChevronRight className="size-5 shrink-0 text-[#AC2A5D] dark:text-[#ff6b9d]"/>}
        </button>
    )
}

function TopicCardSkeleton(){
    return(
        <div className="rounded-2xl border-2 border-[#DCEFE8] bg-white p-3 shadow-[4px_4px_0_#DCEFE8] dark:border-[#1c263c] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#1c263c]">
            <div className="flex items-center gap-4">
                <div className="size-14 shrink-0 animate-pulse rounded-full bg-[#DCEFE8] dark:bg-[#1c263c]"/>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
                    <div className="h-3 w-4/5 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
                    <div className="h-3 w-2/5 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
                </div>
            </div>
        </div>
    )
}

export default function TopicQuizPage(){
    const navigate=useNavigate()
    const {topics,loading,error,reload}=useQuizTopics()
    return(
        <div className="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={()=>navigate("/quests")}
                        aria-label="Go back"
                        className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20] dark:bg-[#ffb1c5]"
                    >
                        <ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]"/>
                    </button>
                    <div className="flex flex-1 items-center justify-center">
                        <div
                            className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
                            style={{transform: "rotate(-3deg)"}}>
                            <span className="text-base font-bold text-[#091828] dark:text-[#091828]">Quiz Topics</span>
                        </div>
                    </div>
                    <div className="size-12 shrink-0" aria-hidden="true"/>
                </header>

                <main className="mt-8 space-y-6">
                    <section className="rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-5 py-5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20] dark:bg-[#2d1b2e]">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#AC2A5D] dark:text-[#ff6b9d]">Financial learning</p>
                        <h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#091828] dark:text-white">Pick a Topic</h2>
                        <p className="mt-1 text-sm leading-relaxed text-[#6b6375] dark:text-[#a0aec0]">Test your money smarts on a subject of your choice.</p>
                    </section>

                    {error&&(
                        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFF1F4] px-4 py-3 dark:border-[#ffb4ab] dark:bg-[#93000a]/30">
                            <AlertTriangle className="size-4 shrink-0 text-[#AC2A5D] dark:text-[#ffb4ab]"/>
                            <p className="flex-1 text-sm font-semibold text-[#AC2A5D] dark:text-[#ffb4ab]">{error}</p>
                        </div>
                    )}

                    {loading?(
                        <div className="space-y-4 px-2">{[1,2,3,4,5,6].map(n=><TopicCardSkeleton key={n}/>)}</div>
                    ):(
                        <div className="space-y-4 px-2">{topics?.map(topic=><TopicCard key={topic.key} topic={topic} onPress={()=>navigate(`/quiz/topics/${topic.key}`)}/>)}</div>
                    )}

                    {!loading&&!error&&topics?.length===0&&(
                        <p className="text-center text-sm text-[#6b6375] dark:text-[#a0aec0]">No quiz topics available right now.</p>
                    )}
                    {!loading&&error&&(
                        <button type="button" onClick={reload} className="w-full rounded-2xl border-2 border-[#AC2A5D] bg-white px-4 py-3 text-sm font-bold text-[#AC2A5D] shadow-[3px_3px_0_#AC2A5D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#ffb4ab] dark:bg-[#131b2e] dark:text-[#ffb4ab] dark:shadow-[3px_3px_0_#ffb4ab]">
                            Retry
                        </button>
                    )}
                </main>
            </div>
        </div>
    )
}