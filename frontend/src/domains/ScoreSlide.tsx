import {motion} from "framer-motion"
import {ArrowUpRight,Minus,Sparkles,TrendingDown} from "lucide-react"
import type {ScoreTier} from "@/features/profile/profileApi"

type ScoreSlideProps={
    scoreStart:number
    scoreEnd:number
    scoreDelta:number
    scoreTierEnd:ScoreTier|null
}

export default function ScoreSlide({scoreStart,scoreEnd,scoreDelta,scoreTierEnd}:Readonly<ScoreSlideProps>){
    const positive=scoreDelta>0
    const negative=scoreDelta<0
    const movementText=positive?`+${scoreDelta}`:`${scoreDelta}`
    let MovementIcon=Minus
    let movementStyle="bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#3a3118] dark:text-[#ffd166]"
    let movementSummary="Your score stayed level this month."
    if(positive){
        MovementIcon=ArrowUpRight
        movementStyle="bg-[#DCEFE8] text-[#0E7A5F] dark:bg-[#0f4f42] dark:text-[#5eead4]"
        movementSummary=`Up ${scoreDelta} points this month.`
    }else if(negative){
        MovementIcon=TrendingDown
        movementStyle="bg-[#FFD9E1] text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"
        movementSummary=`Down ${Math.abs(scoreDelta)} points this month.`
    }
    return(
        <div className="relative flex min-h-[68vh] w-full flex-col justify-center">
            <motion.div
                initial={{opacity:0,y:-16}}
                animate={{opacity:1,y:0}}
                transition={{duration:0.45}}
                className="flex items-center gap-2"
            >
                <Sparkles className="size-4 text-[#0E7A5F] dark:text-[#5eead4]"/>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0E7A5F] dark:text-[#5eead4]">
                    Credit score journey
                </p>
            </motion.div>
            <motion.h1
                initial={{opacity:0,y:24}}
                animate={{opacity:1,y:0}}
                transition={{delay:0.1,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="mt-5 max-w-[330px] text-[3rem] font-extrabold leading-[0.95] tracking-[-0.05em] text-[#091828] dark:text-white"
            >
                Your score made a move.
            </motion.h1>
            <div className="relative mt-12 min-h-[250px]">
                <motion.div
                    initial={{opacity:0,x:-24,y:12}}
                    animate={{opacity:1,x:0,y:0}}
                    transition={{delay:0.3,duration:0.5,ease:[0.22,1,0.36,1]}}
                    className="absolute left-0 top-3"
                >
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#777080] dark:text-[#a0aec0]">
                        Started at
                    </p>
                    <p className="mt-1 text-[2.8rem] font-extrabold leading-none tracking-[-0.06em] text-[#091828] dark:text-white">
                        {scoreStart}
                    </p>
                </motion.div>
                <motion.div
                    initial={{opacity:0,scale:0.5,rotate:-12}}
                    animate={{opacity:1,scale:1,rotate:3}}
                    transition={{delay:0.7,duration:0.45,ease:[0.22,1,0.36,1]}}
                    className={`absolute left-[122px] top-[72px] z-20 flex items-center gap-1.5 rounded-full border-2 border-[#091828] px-4 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20] ${movementStyle}`}
                >
                    <MovementIcon className="size-5"/>
                    <span className="text-xl font-extrabold">{movementText}</span>
                </motion.div>
                <svg
                    viewBox="0 0 340 150"
                    className="absolute left-0 top-[48px] h-[150px] w-full overflow-visible"
                    aria-hidden="true"
                >
                    <motion.path
                        d="M44 68 C105 68 115 95 175 95 C235 95 245 42 302 42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="7"
                        strokeLinecap="round"
                        className="text-[#6FC9B0] dark:text-[#5eead4]"
                        initial={{pathLength:0,opacity:0}}
                        animate={{pathLength:1,opacity:1}}
                        transition={{delay:0.5,duration:1.1,ease:[0.22,1,0.36,1]}}
                    />
                    <motion.path
                        d="M287 29 L306 42 L289 56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[#6FC9B0] dark:text-[#5eead4]"
                        initial={{pathLength:0,opacity:0}}
                        animate={{pathLength:1,opacity:1}}
                        transition={{delay:1.35,duration:0.35}}
                    />
                </svg>
                <motion.div
                    initial={{opacity:0,scale:0.7,x:24}}
                    animate={{opacity:1,scale:1,x:0}}
                    transition={{delay:1.25,duration:0.65,ease:[0.22,1,0.36,1]}}
                    className="absolute right-0 top-[112px] text-right"
                >
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0E7A5F] dark:text-[#5eead4]">
                        Finished at
                    </p>
                    <p className="mt-1 text-[5.8rem] font-extrabold leading-[0.82] tracking-[-0.08em] text-[#091828] dark:text-white">
                        {scoreEnd}
                    </p>
                </motion.div>
            </div>
            <motion.div
                initial={{opacity:0,y:28,scale:0.9,rotate:-4}}
                animate={{opacity:1,y:0,scale:1,rotate:-2}}
                transition={{delay:1.75,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="mt-6 w-fit rounded-[1.6rem] border-2 border-[#091828] bg-[#E8E4F4] px-6 py-4 shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#28223f] dark:shadow-[5px_5px_0_#060e20]"
            >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#5B4D8B] dark:text-[#c5b3f0]">
                    Final score tier
                </p>
                <p className="mt-1 text-[2.2rem] font-extrabold uppercase leading-none text-[#091828] dark:text-white">
                    {scoreTierEnd??"No tier"}
                </p>
            </motion.div>
            <motion.p
                initial={{opacity:0,y:14}}
                animate={{opacity:1,y:0}}
                transition={{delay:2.05,duration:0.45}}
                className="mt-6 max-w-[285px] text-base font-bold leading-relaxed text-[#777080] dark:text-[#a0aec0]"
            >
                {movementSummary}
            </motion.p>
        </div>
    )
}