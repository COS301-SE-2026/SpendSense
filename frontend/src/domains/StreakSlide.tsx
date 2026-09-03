import {motion} from "framer-motion"
import {Sparkles} from "lucide-react"
import { StreakFlame } from "@/components/common/StreakFlame"

type StreakSlideProps={
    longestPaymentStreakThisMonth:number
}

export default function StreakSlide({longestPaymentStreakThisMonth}:Readonly<StreakSlideProps>){
    const hasStreak=longestPaymentStreakThisMonth>0
    const paymentLabel=longestPaymentStreakThisMonth===1?"payment":"payments"

    return(
        <div className="relative flex min-h-[68vh] w-full flex-col justify-center">
            <motion.div
                initial={{opacity:0,y:-16}}
                animate={{opacity:1,y:0}}
                transition={{duration:0.45}}
                className="flex items-center gap-2"
            >
                <Sparkles className="size-4 text-[#5B4D8B] dark:text-[#c5b3f0]"/>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#5B4D8B] dark:text-[#c5b3f0]">
                    Best payment streak
                </p>
            </motion.div>

            <motion.h1
                initial={{opacity:0,y:24}}
                animate={{opacity:1,y:0}}
                transition={{delay:0.1,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="mt-5 max-w-[330px] text-[3rem] font-extrabold leading-[0.95] tracking-[-0.05em] text-[#091828] dark:text-white"
            >
                You kept it going.
            </motion.h1>

            <div className="relative mt-7 flex min-h-[345px] items-center justify-center">
                <motion.div
                    initial={{opacity:0,scale:0.5}}
                    animate={{
                        opacity:[0,0.65,0],
                        scale:[0.65,1.15,1.35],
                    }}
                    transition={{
                        delay:0.5,
                        duration:2.3,
                        repeat:Infinity,
                        repeatDelay:0.4,
                        ease:"easeOut",
                    }}
                    className="absolute size-[245px] rounded-full border-4 border-[#FF6B9D]/40"
                />

                <motion.div
                    initial={{opacity:0,scale:0.5}}
                    animate={{
                        opacity:[0,0.4,0],
                        scale:[0.8,1.25,1.5],
                    }}
                    transition={{
                        delay:1.15,
                        duration:2.5,
                        repeat:Infinity,
                        repeatDelay:0.3,
                        ease:"easeOut",
                    }}
                    className="absolute size-[235px] rounded-full border-4 border-[#FFD166]/45"
                />

                <motion.div
                    initial={{opacity:0,scale:0.7}}
                    animate={{opacity:1,scale:[1,1.04,1]}}
                    transition={{
                        opacity:{delay:0.25,duration:0.5},
                        scale:{delay:0.8,duration:2.4,repeat:Infinity,ease:"easeInOut"},
                    }}
                    className="absolute size-[265px] rounded-[46%_54%_56%_44%/48%_45%_55%_52%] bg-[#FFF0F4] dark:bg-[#341e30]"
                />

                <motion.div
                    initial={{opacity:0,scale:0.55,y:30}}
                    animate={{opacity:1,scale:[1,1.035,1],y:0}}
                    transition={{
                        opacity:{delay:0.35,duration:0.55},
                        y:{delay:0.35,duration:0.7,ease:[0.22,1,0.36,1]},
                        scale:{delay:1,duration:2,repeat:Infinity,ease:"easeInOut"},
                    }}
                    className="relative z-10"
                >
                    <StreakFlame
                        days={longestPaymentStreakThisMonth}
                        label=""
                        size="lg"
                    />
                </motion.div>

                <motion.div
                    initial={{opacity:0,x:-35,rotate:-15,scale:0.8}}
                    animate={{opacity:1,x:0,rotate:-6,scale:1}}
                    transition={{delay:0.75,duration:0.55,ease:[0.22,1,0.36,1]}}
                    className="absolute left-0 top-16 z-30 rounded-full border-2 border-[#091828] bg-white px-4 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]"
                >
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#AC2A5D] dark:text-[#ff6b9d]">
                        Longest this month
                    </p>
                </motion.div>

                <motion.div
                    animate={{
                        x:[0,8,-4,0],
                        y:[0,-10,4,0],
                        rotate:[0,12,-5,0],
                        scale:[1,1.2,0.95,1],
                    }}
                    transition={{duration:3.2,repeat:Infinity,ease:"easeInOut"}}
                    className="absolute right-8 top-12 z-20 text-[#FFD166]"
                >
                    <Sparkles className="size-9"/>
                </motion.div>

                <motion.div
                    animate={{
                        x:[0,-7,5,0],
                        y:[0,8,-6,0],
                        rotate:[0,-14,8,0],
                        scale:[1,0.9,1.2,1],
                    }}
                    transition={{duration:3.6,repeat:Infinity,ease:"easeInOut"}}
                    className="absolute bottom-14 left-7 z-20 text-[#9B7EDE] dark:text-[#c5b3f0]"
                >
                    <Sparkles className="size-6"/>
                </motion.div>

                <motion.div
                    animate={{
                        opacity:[0,1,0],
                        y:[12,-16,-38],
                        x:[0,5,2],
                        scale:[0.4,1,0.3],
                    }}
                    transition={{
                        duration:1.8,
                        repeat:Infinity,
                        repeatDelay:0.6,
                    }}
                    className="absolute left-[46%] top-[30px] size-3 rounded-full bg-[#FF6B9D]"
                />

                <motion.div
                    animate={{
                        opacity:[0,1,0],
                        y:[10,-20,-45],
                        x:[0,-6,-10],
                        scale:[0.3,0.9,0.2],
                    }}
                    transition={{
                        delay:0.7,
                        duration:2,
                        repeat:Infinity,
                        repeatDelay:0.5,
                    }}
                    className="absolute left-[55%] top-[55px] size-2.5 rounded-full bg-[#FFD166]"
                />
            </div>

            <motion.div
                initial={{opacity:0,y:24,scale:0.92}}
                animate={{opacity:1,y:0,scale:1}}
                transition={{delay:1.15,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="text-center"
            >
                <p className="text-[2rem] font-extrabold leading-tight tracking-[-0.04em] text-[#091828] dark:text-white">
                    {hasStreak
                        ?`${longestPaymentStreakThisMonth} ${paymentLabel} in a row`
                        :"No streak this month"}
                </p>

                <motion.div
                    initial={{width:0}}
                    animate={{width:"56%"}}
                    transition={{delay:1.45,duration:0.75,ease:[0.22,1,0.36,1]}}
                    className="mx-auto mt-3 h-1.5 rounded-full bg-[#FF6B9D]"
                />

                <motion.p
                    initial={{opacity:0,y:12}}
                    animate={{opacity:1,y:0}}
                    transition={{delay:1.7,duration:0.45}}
                    className="mx-auto mt-4 max-w-[270px] text-sm font-bold leading-relaxed text-[#777080] dark:text-[#a0aec0]"
                >
                    {hasStreak
                        ?"Your strongest run of on-time payments this month."
                        :"There was no on-time payment streak recorded this month."}
                </motion.p>
            </motion.div>
        </div>
    )
}