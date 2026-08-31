import {useEffect,useMemo,useState} from "react"
import {AnimatePresence,motion} from "framer-motion"
import {ArrowLeft,ChevronLeft,ChevronRight,RefreshCw,Sparkles} from "lucide-react"
import {useNavigate} from "react-router-dom"
import {getLatestWrapped,type WrappedSummary} from "@/features/profile/profileApi"
import IntroSlide from "./IntroSlide"
import ScoreSlide from "./ScoreSlide"
import PaymentsSlide from "./paymentsSlide"
import StreakSlide from "./StreakSlide"
type StorySlide={
    id:string
    duration:number
    eyebrow:string
    title:string
    description:string
    accent:"pink"|"mint"|"yellow"|"lilac"
}
const STORY_SLIDES:StorySlide[]=[
    {
        id:"intro",
        duration:4500,
        eyebrow:"Monthly Wrapped",
        title:"Your Wrapped",
        description:"Your month in payments, progress and rewards.",
        accent:"pink",
    },{
        id:"score",
        duration:6000,
        eyebrow:"Credit score",
        title:"Your score journey",
        description:"This is where your simulated credit score story will come to life.",
        accent:"mint",
    },{
        id:"payments",
        duration:6500,
        eyebrow:"Payments",
        title:"How you showed up",
        description:"Your on-time, late and missed payments will animate across this screen.",
        accent:"yellow",
    },{
        id:"streak",
        duration:5000,
        eyebrow:"Best streak",
        title:"Consistency counts",
        description:"Your strongest payment streak will get its own moment.",
        accent:"lilac",
    },{
        id:"achievements",
        duration:6500,
        eyebrow:"Achievements",
        title:"Rewards unlocked",
        description:"Badges and coins earned during the month will appear here.",
        accent:"pink",
    },{
        id:"learning",
        duration:6000,
        eyebrow:"Learning",
        title:"Knowledge in motion",
        description:"Your completed quizzes and knowledge streak will live here.",
        accent:"mint",
    },{
        id:"share",
        duration:0,
        eyebrow:"That's a wrap",
        title:"Your month. Your progress.",
        description:"This final screen will become the shareable Wrapped summary.",
        accent:"yellow",
    },
]
const ACCENTS={
    pink:{
        background:"bg-[#FFD9E1] dark:bg-[#2d1b2e]",
        foreground:"text-[#AC2A5D] dark:text-[#ff6b9d]",
        blob:"bg-[#FF6B9D] dark:bg-[#ff6b9d]",
        secondary:"bg-[#FFF1F4] dark:bg-[#3a2033]",
    },
    mint:{
        background:"bg-[#DCEFE8] dark:bg-[#0f4f42]",
        foreground:"text-[#0E7A5F] dark:text-[#5eead4]",
        blob:"bg-[#6FC9B0] dark:bg-[#5eead4]",
        secondary:"bg-[#EFFAF6] dark:bg-[#173e39]",
    },
    yellow:{
        background:"bg-[#FFE9B5] dark:bg-[#3a3118]",
        foreground:"text-[#7A5A00] dark:text-[#ffd166]",
        blob:"bg-[#FFD166] dark:bg-[#ffd166]",
        secondary:"bg-[#FFF8E5] dark:bg-[#40371d]",
    },
    lilac:{
        background:"bg-[#E8E4F4] dark:bg-[#28223f]",
        foreground:"text-[#5B4D8B] dark:text-[#c5b3f0]",
        blob:"bg-[#9B7EDE] dark:bg-[#c5b3f0]",
        secondary:"bg-[#F5F2FC] dark:bg-[#312a48]",
    },
}as const
export default function WrappedPage(){
    const navigate=useNavigate()
    const[wrapped,setWrapped]=useState<WrappedSummary|null>(null)
    const[loading,setLoading]=useState(true)
    const[error,setError]=useState<string|null>(null)
    const[activeIndex,setActiveIndex]=useState(0)
    const direction=useMemo(()=>activeIndex,[activeIndex])
    const slide=STORY_SLIDES[activeIndex]
    const isFirst=activeIndex===0
    const isLast=activeIndex===STORY_SLIDES.length-1
    useEffect(()=>{
        let mounted=true
        const load=async()=>{
            try{
                const response=await getLatestWrapped()
                if(mounted){
                    setWrapped(response)
                }
            }catch(err){
                if(mounted){
                    setError(err instanceof Error?err.message:"Failed to load Wrapped.")
                }
            }finally{
                if(mounted){
                    setLoading(false)
                }
            }
        }
        void load()
        return()=>{
            mounted=false
        }
    },[])
    const goNext=()=>{
        if(isLast){
            return
        }
        setActiveIndex(index=>Math.min(index+1,STORY_SLIDES.length-1))
    }
    const goPrevious=()=>{
        if(isFirst){
            return
        }
        setActiveIndex(index=>Math.max(index-1,0))
    }
    const restart=()=>{
        setActiveIndex(0)
    }
    useEffect(()=>{
        if(isLast||slide.duration===0||loading||error||!wrapped){
            return
        }
        const timer=window.setTimeout(()=>{
            setActiveIndex(index=>Math.min(index+1,STORY_SLIDES.length-1))
        },slide.duration)
        return()=>{
            window.clearTimeout(timer)
        }
    },[activeIndex,isLast,slide.duration,loading,error,wrapped])
    if(loading){
        return(
            <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4FBF7] px-5 dark:bg-[#0b1326]">
                <div className="text-center">
                    <motion.div
                        animate={{rotate:360,scale:[1,1.12,1]}}
                        transition={{rotate:{duration:2,repeat:Infinity,ease:"linear"},scale:{duration:1.5,repeat:Infinity,ease:"easeInOut"}}}
                        className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFD9E1] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#2d1b2e] dark:shadow-[4px_4px_0_#060e20]"
                    >
                        <Sparkles className="size-7 text-[#AC2A5D] dark:text-[#ff6b9d]"/>
                    </motion.div>
                    <p className="mt-5 text-sm font-extrabold text-[#091828] dark:text-white">Getting your Wrapped ready...</p>
                </div>
            </main>
        )
    }
    if(error||!wrapped){
        return(
            <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4FBF7] px-5 dark:bg-[#0b1326]">
                <div className="w-full max-w-sm rounded-3xl border-2 border-[#091828] bg-white p-6 text-center shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[5px_5px_0_#060e20]">
                    <p className="text-xl font-extrabold text-[#091828] dark:text-white">Wrapped unavailable</p>
                    <p className="mt-2 text-sm text-[#6b6375] dark:text-[#a0aec0]">{error??"We couldn't load your Wrapped."}</p>
                    <button
                        type="button"
                        onClick={()=>window.location.reload()}
                        className="mt-5 w-full rounded-full border-2 border-[#091828] bg-[#091828] px-5 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_#FF6B9D] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:text-[#650030]"
                    >
                        Try again
                    </button>
                </div>
            </main>
        )
    }
    return(
        <main className="relative min-h-[100dvh] overflow-hidden bg-[#F4FBF7] text-[#091828] dark:bg-[#0b1326] dark:text-white">
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    key={`${slide.id}-blob-one`}
                    initial={{scale:0.7,opacity:0}}
                    animate={{scale:1,opacity:0.22,x:[0,24,-8,0],y:[0,-18,10,0],rotate:[0,12,-6,0]}}
                    transition={{opacity:{duration:0.5},scale:{duration:0.7},x:{duration:8,repeat:Infinity,ease:"easeInOut"},y:{duration:7,repeat:Infinity,ease:"easeInOut"},rotate:{duration:9,repeat:Infinity,ease:"easeInOut"}}}
                    className={`absolute -right-20 -top-16 size-72 rounded-[42%_58%_61%_39%/40%_43%_57%_60%] blur-sm ${ACCENTS[slide.accent].blob}`}
                />
                <motion.div
                    key={`${slide.id}-blob-two`}
                    initial={{scale:0.7,opacity:0}}
                    animate={{scale:1,opacity:0.16,x:[0,-20,12,0],y:[0,22,-8,0],rotate:[0,-14,8,0]}}
                    transition={{opacity:{duration:0.7},scale:{duration:0.8},x:{duration:9,repeat:Infinity,ease:"easeInOut"},y:{duration:8,repeat:Infinity,ease:"easeInOut"},rotate:{duration:10,repeat:Infinity,ease:"easeInOut"}}}
                    className={`absolute -bottom-24 -left-24 size-80 rounded-[58%_42%_38%_62%/48%_59%_41%_52%] blur-sm ${ACCENTS[slide.accent].blob}`}
                />
            </div>
            <div className="relative z-20 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-6 pt-4">
                <div className="flex gap-1.5">
                    {STORY_SLIDES.map((story,index)=>{
                        const complete=index<activeIndex
                        const active=index===activeIndex
                        return(
                            <div key={story.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#091828]/15 dark:bg-white/15">
                                {complete&&<div className="h-full w-full rounded-full bg-[#091828] dark:bg-white"/>}
                                {active&&(
                                    <motion.div
                                        key={`${story.id}-${activeIndex}`}
                                        initial={{width:"0%"}}
                                        animate={{width:"100%"}}
                                        transition={{duration:story.duration===0?0.4:story.duration/1000,ease:"linear"}}
                                        className="h-full rounded-full bg-[#091828] dark:bg-white"
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={()=>navigate(-1)}
                        className="flex size-11 items-center justify-center rounded-full border-2 border-[#091828] bg-white shadow-[3px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[3px_3px_0_#060e20]"
                        aria-label="Exit Wrapped"
                    >
                        <ArrowLeft className="size-5"/>
                    </button>
                    <div className="rounded-full border-2 border-[#091828] bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[3px_3px_0_#060e20]">
                        {activeIndex+1}/{STORY_SLIDES.length}
                    </div>
                </div>
                <div className="relative flex flex-1 items-center">
                    <button
                        type="button"
                        onClick={goPrevious}
                        disabled={isFirst}
                        aria-label="Previous Wrapped story"
                        className="absolute inset-y-0 left-0 z-30 w-[32%] disabled:pointer-events-none"
                    />
                    <button
                        type="button"
                        onClick={goNext}
                        disabled={isLast}
                        aria-label="Next Wrapped story"
                        className="absolute inset-y-0 right-0 z-30 w-[68%] disabled:pointer-events-none"
                    />
                    <AnimatePresence mode="wait">
                        <motion.section
                            key={slide.id}
                            initial={{opacity:0,x:direction===0?0:48,scale:0.94,rotate:1.5}}
                            animate={{opacity:1,x:0,scale:1,rotate:0}}
                            exit={{opacity:0,x:-48,scale:0.96,rotate:-1.5}}
                            transition={{duration:0.5,ease:[0.22,1,0.36,1]}}
                            className="relative z-20 w-full"
                        >
                            {slide.id==="intro"?(
                                <IntroSlide monthLabel={wrapped.monthLabel}/>
                            ):slide.id==="score"?(
                                <ScoreSlide
                                    scoreStart={wrapped.scoreStart}
                                    scoreEnd={wrapped.scoreEnd}
                                    scoreDelta={wrapped.scoreDelta}
                                    scoreTierEnd={wrapped.scoreTierEnd}
                                />
                            ):slide.id==="payments"?(
                                <PaymentsSlide
                                    onTimePayments={wrapped.onTimePayments}
                                    latePayments={wrapped.latePayments}
                                    missedPayments={wrapped.missedPayments}
                                    onTimePaymentRate={wrapped.onTimePaymentRate}
                                />
                            ):slide.id==="streak"?(
                                <StreakSlide longestPaymentStreakThisMonth={wrapped.longestPaymentStreakThisMonth}/>
                            ):(
                                <>
                                    <motion.div
                                        initial={{opacity:0,y:18,rotate:-3}}
                                        animate={{opacity:1,y:0,rotate:-3}}
                                        transition={{delay:0.1,duration:0.45}}
                                        className={`inline-flex items-center gap-2 rounded-full border-2 border-[#091828] px-4 py-2 shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:shadow-[3px_3px_0_#060e20] ${ACCENTS[slide.accent].background}`}
                                    >
                                        <Sparkles className={`size-4 ${ACCENTS[slide.accent].foreground}`}/>
                                        <span className={`text-[11px] font-extrabold uppercase tracking-[0.14em] ${ACCENTS[slide.accent].foreground}`}>{slide.eyebrow}</span>
                                    </motion.div>
                                    <motion.h1
                                        initial={{opacity:0,y:30,scale:0.94}}
                                        animate={{opacity:1,y:0,scale:1}}
                                        transition={{delay:0.2,duration:0.55,ease:[0.22,1,0.36,1]}}
                                        className="mt-7 max-w-[330px] text-[3.5rem] font-extrabold leading-[0.92] tracking-[-0.05em] text-[#091828] dark:text-white"
                                    >
                                        {slide.title}
                                    </motion.h1>
                                    <motion.p
                                        initial={{opacity:0,y:24}}
                                        animate={{opacity:1,y:0}}
                                        transition={{delay:0.35,duration:0.5}}
                                        className="mt-6 max-w-[310px] text-base font-semibold leading-relaxed text-[#6b6375] dark:text-[#a0aec0]"
                                    >
                                        {slide.description}
                                    </motion.p>
                                    <motion.div
                                        initial={{opacity:0,scale:0.8,rotate:6}}
                                        animate={{opacity:1,scale:1,rotate:3}}
                                        transition={{delay:0.5,duration:0.55,ease:[0.22,1,0.36,1]}}
                                        className={`mt-9 rounded-[2rem] border-2 border-[#091828] p-6 shadow-[6px_6px_0_#091828] dark:border-[#060e20] dark:shadow-[6px_6px_0_#060e20] ${ACCENTS[slide.accent].secondary}`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className={`text-xs font-extrabold uppercase tracking-[0.14em] ${ACCENTS[slide.accent].foreground}`}>Template area</p>
                                                <p className="mt-2 text-2xl font-extrabold leading-tight text-[#091828] dark:text-white">{isLast?"Ready to share":"Story content goes here"}</p>
                                            </div>
                                            <motion.div
                                                animate={{rotate:[-5,8,-5],scale:[1,1.08,1]}}
                                                transition={{duration:2.5,repeat:Infinity,ease:"easeInOut"}}
                                                className={`flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] dark:border-[#060e20] ${ACCENTS[slide.accent].background}`}
                                            >
                                                <Sparkles className={`size-7 ${ACCENTS[slide.accent].foreground}`}/>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                    {isLast&&(
                                        <motion.button
                                            type="button"
                                            onClick={(event)=>{
                                                event.stopPropagation()
                                                restart()
                                            }}
                                            initial={{opacity:0,y:18}}
                                            animate={{opacity:1,y:0}}
                                            transition={{delay:0.65,duration:0.45}}
                                            className="relative z-40 mt-8 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#091828] px-6 py-4 text-base font-extrabold text-white shadow-[5px_5px_0_#FF6B9D] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:border-[#060e20] dark:bg-[#ffb1c5] dark:text-[#650030] dark:shadow-[5px_5px_0_#ff6b9d]"
                                        >
                                            <RefreshCw className="size-5"/>
                                            Replay Wrapped
                                        </motion.button>
                                    )}
                                </>
                            )}
                        </motion.section>
                    </AnimatePresence>
                </div>
                <div className="relative z-40 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={goPrevious}
                        disabled={isFirst}
                        className="flex size-11 items-center justify-center rounded-full border-2 border-[#091828] bg-white shadow-[3px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-25 dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[3px_3px_0_#060e20]"
                        aria-label="Previous story"
                    >
                        <ChevronLeft className="size-5"/>
                    </button>
                    <p className="text-xs font-bold text-[#6b6375] dark:text-[#a0aec0]">Tap left or right</p>
                    <button
                        type="button"
                        onClick={goNext}
                        disabled={isLast}
                        className="flex size-11 items-center justify-center rounded-full border-2 border-[#091828] bg-white shadow-[3px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-25 dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[3px_3px_0_#060e20]"
                        aria-label="Next story"
                    >
                        <ChevronRight className="size-5"/>
                    </button>
                </div>
            </div>
        </main>
    )
}