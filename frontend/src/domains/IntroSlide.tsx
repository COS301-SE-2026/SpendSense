import {motion} from "framer-motion"
import {Sparkles} from "lucide-react"

export default function IntroSlide({monthLabel}:Readonly<{monthLabel:string}>){
    return(
        <div className="relative flex min-h-[68vh] w-full flex-col justify-center overflow-hidden">
            <motion.div
                initial={{opacity:0,scale:0.7,rotate:-12}}
                animate={{opacity:1,scale:1,rotate:-7}}
                transition={{duration:0.7,ease:[0.22,1,0.36,1]}}
                className="absolute right-1 top-14 flex size-20 items-center justify-center rounded-[28px] border-2 border-[#091828] bg-[#FFD166] shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#ffd166] dark:shadow-[5px_5px_0_#060e20]"
            >
                <Sparkles className="size-9 text-[#7A5A00]"/>
            </motion.div>
            <motion.div
                initial={{opacity:0,x:-35,rotate:4}}
                animate={{opacity:1,x:0,rotate:-3}}
                transition={{delay:0.1,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="w-fit rounded-full border-2 border-[#091828] bg-white px-5 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]"
            >
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#AC2A5D] dark:text-[#ff6b9d]">Your month in SpendSense</p>
            </motion.div>
            <motion.p
                initial={{opacity:0,y:30}}
                animate={{opacity:1,y:0}}
                transition={{delay:0.25,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="mt-10 text-xl font-extrabold uppercase tracking-[0.2em] text-[#6b6375] dark:text-[#a0aec0]"
            >
                Your
            </motion.p>
            <motion.div
                initial={{opacity:0,scale:0.65,rotate:-8}}
                animate={{opacity:1,scale:1,rotate:-2}}
                transition={{delay:0.4,duration:0.7,ease:[0.22,1,0.36,1]}}
                className="relative mt-2"
            >
                <motion.div
                    animate={{rotate:[-2,1,-2],y:[0,-4,0]}}
                    transition={{duration:3.5,repeat:Infinity,ease:"easeInOut"}}
                    className="inline-block rounded-[2rem] border-2 border-[#091828] bg-[#FF6B9D] px-5 py-4 shadow-[7px_7px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[7px_7px_0_#060e20]"
                >
                    <h1 className="text-[3.6rem] font-extrabold uppercase leading-none tracking-[-0.06em] text-[#6E0034] dark:text-[#650030]">{monthLabel}</h1>
                </motion.div>
            </motion.div>
            <motion.h2
                initial={{opacity:0,y:40,scale:0.9}}
                animate={{opacity:1,y:0,scale:1}}
                transition={{delay:0.65,duration:0.65,ease:[0.22,1,0.36,1]}}
                className="mt-5 text-[4.5rem] font-extrabold uppercase leading-[0.82] tracking-[-0.07em] text-[#091828] dark:text-white"
            >
                Wrapped
            </motion.h2>
            <motion.div
                initial={{opacity:0,width:0}}
                animate={{opacity:1,width:"100%"}}
                transition={{delay:0.9,duration:0.7,ease:[0.22,1,0.36,1]}}
                className="mt-7 h-2 max-w-[260px] rounded-full bg-[#6FC9B0] dark:bg-[#5eead4]"
            />
            <motion.p
                initial={{opacity:0,y:16}}
                animate={{opacity:1,y:0}}
                transition={{delay:1,duration:0.5}}
                className="mt-5 max-w-[290px] text-base font-semibold leading-relaxed text-[#6b6375] dark:text-[#a0aec0]"
            >
                Your payments, progress and rewards from the month, all in one place.
            </motion.p>
        </div>
    )
}