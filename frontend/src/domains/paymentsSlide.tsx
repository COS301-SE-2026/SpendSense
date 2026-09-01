import {motion} from "framer-motion"
import {Check,Clock,Sparkles,X} from "lucide-react"

type PaymentsSlideProps={
    onTimePayments:number
    latePayments:number
    missedPayments:number
    onTimePaymentRate:number
}

export default function PaymentsSlide({onTimePayments,latePayments,missedPayments,onTimePaymentRate}:Readonly<PaymentsSlideProps>){
    const paymentRate=Math.round((onTimePaymentRate<=1?onTimePaymentRate*100:onTimePaymentRate))
    const circumference=2*Math.PI*76
    const progress=circumference-(paymentRate/100)*circumference
    return(
        <div className="relative flex min-h-[68vh] w-full flex-col justify-center">
            <motion.div
                initial={{opacity:0,y:-16}}
                animate={{opacity:1,y:0}}
                transition={{duration:0.45}}
                className="flex items-center gap-2"
            >
                <Sparkles className="size-4 text-[#7A5A00] dark:text-[#ffd166]"/>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7A5A00] dark:text-[#ffd166]">
                    Payment performance
                </p>
            </motion.div>
            <motion.h1
                initial={{opacity:0,y:24}}
                animate={{opacity:1,y:0}}
                transition={{delay:0.1,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="mt-5 max-w-[330px] text-[3rem] font-extrabold leading-[0.95] tracking-[-0.05em] text-[#091828] dark:text-white"
            >
                Here&apos;s how you showed up.
            </motion.h1>
            <div className="relative mx-auto mt-10 size-[240px]">
                <svg
                    viewBox="0 0 180 180"
                    className="absolute inset-0 size-full -rotate-90"
                    aria-hidden="true"
                >
                    <circle
                        cx="90"
                        cy="90"
                        r="76"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="14"
                        className="text-[#091828]/10 dark:text-white/10"
                    />
                    <motion.circle
                        cx="90"
                        cy="90"
                        r="76"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{strokeDashoffset:circumference}}
                        animate={{strokeDashoffset:progress}}
                        transition={{delay:0.4,duration:1.3,ease:[0.22,1,0.36,1]}}
                        className="text-[#FFD166] dark:text-[#ffd166]"
                    />
                </svg>
                <motion.div
                    initial={{opacity:0,scale:0.7}}
                    animate={{opacity:1,scale:1}}
                    transition={{delay:0.65,duration:0.6,ease:[0.22,1,0.36,1]}}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                >
                    <p className="text-[4.8rem] font-extrabold leading-none tracking-[-0.08em] text-[#091828] dark:text-white">
                        {paymentRate}%
                    </p>
                    <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#7A5A00] dark:text-[#ffd166]">
                        On time
                    </p>
                </motion.div>
                <motion.div
                    initial={{opacity:0,scale:0.5,rotate:-15}}
                    animate={{opacity:1,scale:1,rotate:-6}}
                    transition={{delay:1.05,duration:0.45,ease:[0.22,1,0.36,1]}}
                    className="absolute -left-11 top-7 flex size-[78px] flex-col items-center justify-center rounded-[1.4rem] border-2 border-[#091828] bg-[#DCEFE8] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#0f4f42] dark:shadow-[4px_4px_0_#060e20]"
                >
                    <Check className="size-5 text-[#0E7A5F] dark:text-[#5eead4]"/>
                    <p className="mt-1 text-2xl font-extrabold leading-none text-[#091828] dark:text-white">
                        {onTimePayments}
                    </p>
                </motion.div>
                <motion.div
                    initial={{opacity:0,scale:0.5,rotate:15}}
                    animate={{opacity:1,scale:1,rotate:6}}
                    transition={{delay:1.2,duration:0.45,ease:[0.22,1,0.36,1]}}
                    className="absolute -right-12 top-24 flex size-[76px] flex-col items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFE9B5] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#3a3118] dark:shadow-[4px_4px_0_#060e20]"
                >
                    <Clock className="size-5 text-[#7A5A00] dark:text-[#ffd166]"/>
                    <p className="mt-1 text-2xl font-extrabold leading-none text-[#091828] dark:text-white">
                        {latePayments}
                    </p>
                </motion.div>
                <motion.div
                    initial={{opacity:0,scale:0.5,rotate:-12}}
                    animate={{opacity:1,scale:1,rotate:-4}}
                    transition={{delay:1.35,duration:0.45,ease:[0.22,1,0.36,1]}}
                    className="absolute bottom-0 -left-6 flex size-[72px] flex-col items-center justify-center rounded-[1.2rem] border-2 border-[#091828] bg-[#FFD9E1] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#2d1b2e] dark:shadow-[4px_4px_0_#060e20]"
                >
                    <X className="size-5 text-[#AC2A5D] dark:text-[#ff6b9d]"/>
                    <p className="mt-1 text-2xl font-extrabold leading-none text-[#091828] dark:text-white">
                        {missedPayments}
                    </p>
                </motion.div>
            </div>
            <motion.div
                initial={{opacity:0,y:24}}
                animate={{opacity:1,y:0}}
                transition={{delay:1.55,duration:0.5}}
                className="mt-9 grid grid-cols-3 gap-3"
            >
                <div className="text-center">
                    <div className="mx-auto mb-2 size-2.5 rounded-full bg-[#6FC9B0] dark:bg-[#5eead4]"/>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#777080] dark:text-[#a0aec0]">
                        On time
                    </p>
                </div>
                <div className="text-center">
                    <div className="mx-auto mb-2 size-2.5 rounded-full bg-[#FFD166]"/>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#777080] dark:text-[#a0aec0]">
                        Late
                    </p>
                </div>
                <div className="text-center">
                    <div className="mx-auto mb-2 size-2.5 rounded-full bg-[#FF6B9D]"/>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#777080] dark:text-[#a0aec0]">
                        Missed
                    </p>
                </div>
            </motion.div>
            <motion.p
                initial={{opacity:0,y:14}}
                animate={{opacity:1,y:0}}
                transition={{delay:1.8,duration:0.45}}
                className="mx-auto mt-6 max-w-[300px] text-center text-base font-bold leading-relaxed text-[#777080] dark:text-[#a0aec0]"
            >
                {paymentRate===100
                    ?"Every resolved payment landed on time."
                    :`${paymentRate}% of your resolved payments landed on time.`}
            </motion.p>
        </div>
    )
}