import {useEffect,useRef,useState} from "react"
import {motion} from "framer-motion"
import {toPng} from "html-to-image"
import {Download,Share2,Sparkles,Star,TrendingUp} from "lucide-react"
import SpendSenseLogo from "@/components/SpendSenseLogoLight.svg"

type ShareSlideProps={
    monthLabel:string
    scoreDelta:number
    onTimePaymentRate:number
    longestPaymentStreakThisMonth:number
    numberBadgesEarned:number
    quizzesCompleted:number
}

function useCountUp(value:number,duration=900){
    const[count,setCount]=useState(0)
    useEffect(()=>{
        let frame:number
        const start=performance.now()
        const animate=(time:number)=>{
            const progress=Math.min((time-start)/duration,1)
            const eased=1-Math.pow(1-progress,3)
            setCount(Math.round(value*eased))
            if(progress<1){
                frame=requestAnimationFrame(animate)
            }
        }
        frame=requestAnimationFrame(animate)
        return()=>cancelAnimationFrame(frame)
    },[value,duration])
    return count
}

export default function ShareSlide(props:Readonly<ShareSlideProps>){
    const sharePageRef=useRef<HTMLDivElement>(null)
    const[isExporting,setIsExporting]=useState(false)
    const paymentRate=Math.round(
        props.onTimePaymentRate<=1
            ?props.onTimePaymentRate*100
            :props.onTimePaymentRate
    )
    const animatedScore=useCountUp(Math.abs(props.scoreDelta))
    const animatedPaymentRate=useCountUp(paymentRate)
    const animatedStreak=useCountUp(props.longestPaymentStreakThisMonth)
    const animatedBadges=useCountUp(props.numberBadgesEarned)
    const animatedQuizzes=useCountUp(props.quizzesCompleted)
    const scoreValue=isExporting?Math.abs(props.scoreDelta):animatedScore
    let scoreMovement="0"
    if(props.scoreDelta>0){
        scoreMovement=`+${scoreValue}`
    }else if(props.scoreDelta<0){
        scoreMovement=`-${scoreValue}`
    }
    const shownPaymentRate=isExporting?paymentRate:animatedPaymentRate
    const shownStreak=isExporting?props.longestPaymentStreakThisMonth:animatedStreak
    const shownBadges=isExporting?props.numberBadgesEarned:animatedBadges
    const shownQuizzes=isExporting?props.quizzesCompleted:animatedQuizzes
    const waitForRender=()=>{
        return new Promise<void>((resolve)=>{
            requestAnimationFrame(()=>{
                requestAnimationFrame(()=>{
                    resolve()
                })
            })
        })
    }
    const createImage=async()=>{
        if(!sharePageRef.current){
            throw new Error("Share page unavailable.")
        }
        setIsExporting(true)
        await document.fonts.ready
        await waitForRender()
        try{
            return await toPng(sharePageRef.current,{
                cacheBust:true,
                pixelRatio:3,
                backgroundColor:"#F4FBF7",
            })
        }finally{
            setIsExporting(false)
        }
    }
    const downloadImage=async()=>{
        const dataUrl=await createImage()
        const link=document.createElement("a")
        link.href=dataUrl
        link.download=`SpendSense-${props.monthLabel}-Wrapped.png`
        document.body.appendChild(link)
        link.click()
        link.remove()
    }
    const shareImage=async()=>{
        const dataUrl=await createImage()
        const response=await fetch(dataUrl)
        const blob=await response.blob()
        const file=new File(
            [blob],
            `SpendSense-${props.monthLabel}-Wrapped.png`,
            {type:"image/png"},
        )
        if(navigator.share&&navigator.canShare?.({files:[file]})){
            await navigator.share({
                title:`${props.monthLabel} Wrapped`,
                text:"My SpendSense Monthly Wrapped",
                files:[file],
            })
            return
        }
        const link=document.createElement("a")
        link.href=dataUrl
        link.download=file.name
        document.body.appendChild(link)
        link.click()
        link.remove()
    }
    return(
        <div className="relative flex min-h-[68vh] w-full flex-col justify-center">
            <motion.div
                initial={{opacity:0,y:22,scale:0.94}}
                animate={{opacity:1,y:0,scale:1}}
                transition={{duration:0.65,ease:[0.22,1,0.36,1]}}
            >
                <div
                    ref={sharePageRef}
                    className="relative h-[545px] w-full overflow-hidden rounded-[2.3rem] border-2 border-[#091828] bg-[#F4FBF7] shadow-[7px_7px_0_#091828] dark:border-[#060e20] dark:bg-[#111a2d] dark:shadow-[7px_7px_0_#060e20]"
                >
                    <div className="absolute -right-20 -top-20 size-[220px] rounded-full bg-[#FFE9B5] dark:bg-[#493b18]"/>
                    <div className="absolute -bottom-24 -left-20 size-[230px] rounded-full bg-[#FFD9E1] dark:bg-[#402030]"/>
                    <div className="absolute right-7 top-[190px] size-3 rounded-full bg-[#FF6B9D]"/>
                    <div className="absolute bottom-[135px] left-8 size-2.5 rounded-full bg-[#9B7EDE]"/>
                    <div className="absolute bottom-[78px] right-16 size-2.5 rounded-full bg-[#6FC9B0]"/>

                    {!isExporting&&(
                        <motion.div
                            initial={{x:"-150%"}}
                            animate={{x:"250%"}}
                            transition={{
                                delay:1.2,
                                duration:1.4,
                                ease:"easeInOut",
                            }}
                            className="pointer-events-none absolute -top-20 z-30 h-[700px] w-20 rotate-[18deg] bg-white/35 blur-xl"
                        />
                    )}

                    <div className="relative z-10 px-6 pt-5">
                        <div className="flex items-center justify-between">
                            <img
                                src={SpendSenseLogo}
                                alt="SpendSense"
                                className="h-12 w-auto object-contain"
                            />

                            <div className="rounded-full border-2 border-[#091828] bg-white px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#091828] shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:text-white dark:shadow-[3px_3px_0_#060e20]">
                                Monthly Wrapped
                            </div>
                        </div>

                        <div className="mt-5">
                            <p className="text-[2.8rem] font-extrabold leading-[0.88] tracking-[-0.06em] text-[#091828] dark:text-white">
                                {props.monthLabel}
                            </p>
                            <p className="text-[3.3rem] font-extrabold leading-[0.88] tracking-[-0.065em] text-[#091828] dark:text-white">
                                Wrapped.
                            </p>
                        </div>
                    </div>

                    <motion.div
                        animate={{rotate:[-5,3,-5],y:[0,-4,0]}}
                        transition={{duration:2.8,repeat:Infinity,ease:"easeInOut"}}
                        className="absolute right-7 top-[130px] z-20 flex size-14 items-center justify-center rounded-[1.2rem] border-2 border-[#091828] bg-[#FFD166] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20]"
                    >
                        <Star className="size-6 text-[#7A5A00]"/>
                    </motion.div>

                    <div className="absolute left-6 top-[220px] z-10">
                        <div className="flex items-end gap-3">
                            <div>
                                <motion.p
                                    initial={{opacity:0,scale:0.7}}
                                    animate={{opacity:1,scale:1}}
                                    transition={{delay:0.35,duration:0.5}}
                                    className="text-[4.8rem] font-extrabold leading-[0.8] tracking-[-0.08em] text-[#091828] dark:text-white"
                                >
                                    {scoreMovement}
                                </motion.p>

                                <div className="mt-3 flex items-center gap-2">
                                    <TrendingUp className="size-4 text-[#0E7A5F] dark:text-[#5eead4]"/>
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0E7A5F] dark:text-[#5eead4]">
                                        Score movement
                                    </p>
                                </div>
                            </div>

                            <motion.div
                                initial={{opacity:0,scale:0.65,rotate:8}}
                                animate={{opacity:1,scale:[1,1.06,1],rotate:[3,-2,3]}}
                                transition={{
                                    opacity:{delay:0.5,duration:0.4},
                                    scale:{delay:1,duration:2.6,repeat:Infinity,ease:"easeInOut"},
                                    rotate:{delay:1,duration:2.6,repeat:Infinity,ease:"easeInOut"},
                                }}
                                className="mb-1 rounded-[1.4rem] border-2 border-[#091828] bg-[#DCEFE8] px-4 py-3 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#0f4f42] dark:shadow-[4px_4px_0_#060e20]"
                            >
                                <p className="text-[1.7rem] font-extrabold leading-none text-[#091828] dark:text-white">
                                    {shownPaymentRate}%
                                </p>
                                <p className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#0E7A5F] dark:text-[#5eead4]">
                                    On-time
                                </p>
                            </motion.div>
                        </div>
                    </div>

                    <div className="absolute left-6 right-6 top-[365px] z-10 grid grid-cols-3 gap-2">
                        <motion.div
                            initial={{opacity:0,y:18,scale:0.85}}
                            animate={{opacity:1,y:0,scale:1}}
                            transition={{delay:0.55,duration:0.45,ease:[0.22,1,0.36,1]}}
                            className="rounded-[1.3rem] bg-[#E8E4F4] px-3 py-3 dark:bg-[#28223f]"
                        >
                            <p className="text-[1.7rem] font-extrabold leading-none text-[#091828] dark:text-white">
                                {shownStreak}
                            </p>
                            <p className="mt-2 text-[7px] font-extrabold uppercase tracking-[0.12em] text-[#5B4D8B] dark:text-[#c5b3f0]">
                                Best streak
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{opacity:0,y:18,scale:0.85}}
                            animate={{opacity:1,y:0,scale:1}}
                            transition={{delay:0.68,duration:0.45,ease:[0.22,1,0.36,1]}}
                            className="rounded-[1.3rem] bg-[#FFD9E1] px-3 py-3 dark:bg-[#2d1b2e]"
                        >
                            <p className="text-[1.7rem] font-extrabold leading-none text-[#091828] dark:text-white">
                                +{shownBadges}
                            </p>
                            <p className="mt-2 text-[7px] font-extrabold uppercase tracking-[0.12em] text-[#AC2A5D] dark:text-[#ff6b9d]">
                                Badges
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{opacity:0,y:18,scale:0.85}}
                            animate={{opacity:1,y:0,scale:1}}
                            transition={{delay:0.81,duration:0.45,ease:[0.22,1,0.36,1]}}
                            className="rounded-[1.3rem] bg-[#FFE9B5] px-3 py-3 dark:bg-[#3a3118]"
                        >
                            <p className="text-[1.7rem] font-extrabold leading-none text-[#091828] dark:text-white">
                                {shownQuizzes}
                            </p>
                            <p className="mt-2 text-[7px] font-extrabold uppercase tracking-[0.12em] text-[#7A5A00] dark:text-[#ffd166]">
                                Quizzes
                            </p>
                        </motion.div>
                    </div>

                    <div className="absolute bottom-7 left-6 right-6 z-10 flex items-end justify-between">
                        <div>
                            <p className="text-[1.25rem] font-extrabold leading-tight tracking-[-0.03em] text-[#091828] dark:text-white">
                                My month.
                            </p>
                            <p className="text-[1.25rem] font-extrabold leading-tight tracking-[-0.03em] text-[#091828] dark:text-white">
                                My progress.
                            </p>
                        </div>

                        <motion.div
                            animate={{rotate:[-5,7,-5],scale:[1,1.12,1]}}
                            transition={{duration:2.7,repeat:Infinity,ease:"easeInOut"}}
                            className="flex items-center gap-2"
                        >
                            <Sparkles className="size-5 text-[#FF6B9D]"/>
                            <Sparkles className="size-4 text-[#FFD166]"/>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{opacity:0,y:16}}
                animate={{opacity:1,y:0}}
                transition={{delay:0.75,duration:0.45}}
                className="relative z-40 mt-5 grid grid-cols-2 gap-3"
            >
                <button
                    type="button"
                    onClick={(event)=>{
                        event.stopPropagation()
                        void shareImage()
                    }}
                    className="flex items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#091828] px-4 py-3.5 text-sm font-extrabold text-white shadow-[4px_4px_0_#FF6B9D] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060e20] dark:bg-[#ffb1c5] dark:text-[#650030]"
                >
                    <Share2 className="size-4"/>
                    Share image
                </button>

                <button
                    type="button"
                    onClick={(event)=>{
                        event.stopPropagation()
                        void downloadImage()
                    }}
                    className="flex items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-white px-4 py-3.5 text-sm font-extrabold text-[#091828] shadow-[4px_4px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060e20] dark:bg-[#131b2e] dark:text-white dark:shadow-[4px_4px_0_#060e20]"
                >
                    <Download className="size-4"/>
                    Save image
                </button>
            </motion.div>
        </div>
    )
}