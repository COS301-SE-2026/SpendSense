import {motion} from "framer-motion"
import {BookOpen,Brain,Check,Flame,Sparkles} from "lucide-react"

type LearningSlideProps={
    quizzesCompleted:number
    knowledgeStreakEnd:number
}

export default function LearningSlide({quizzesCompleted,knowledgeStreakEnd}:Readonly<LearningSlideProps>){
    const hasQuizzes=quizzesCompleted>0
    const hasKnowledgeStreak=knowledgeStreakEnd>0
    const quizLabel=quizzesCompleted===1?"quiz":"quizzes"
    const dayLabel=knowledgeStreakEnd===1?"day":"days"
    return(
        <div className="relative flex min-h-[68vh] w-full flex-col justify-center">
            <motion.div
                initial={{opacity:0,y:-16}}
                animate={{opacity:1,y:0}}
                transition={{duration:0.45}}
                className="flex items-center gap-2"
            >
                <BookOpen className="size-4 text-[#0E7A5F] dark:text-[#5eead4]"/>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0E7A5F] dark:text-[#5eead4]">
                    Learning moment
                </p>
            </motion.div>
            <motion.h1
                initial={{opacity:0,y:24}}
                animate={{opacity:1,y:0}}
                transition={{delay:0.1,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="mt-5 max-w-[330px] text-[3rem] font-extrabold leading-[0.95] tracking-[-0.05em] text-[#091828] dark:text-white"
            >
                Your brain was in motion.
            </motion.h1>
            <div className="relative mt-6 min-h-[390px]">
                <motion.div
                    initial={{opacity:0,scale:0.5}}
                    animate={{opacity:1,scale:[1,1.04,1]}}
                    transition={{
                        opacity:{delay:0.2,duration:0.5},
                        scale:{delay:0.8,duration:3,repeat:Infinity,ease:"easeInOut"},
                    }}
                    className="absolute left-2 top-16 size-[235px] rounded-[46%_54%_57%_43%/48%_42%_58%_52%] bg-[#DCEFE8] dark:bg-[#123d36]"
                />
                <motion.div
                    initial={{opacity:0,x:-35,scale:0.65,rotate:-10}}
                    animate={{opacity:1,x:0,scale:1,rotate:-4}}
                    transition={{delay:0.3,duration:0.75,ease:[0.22,1,0.36,1]}}
                    className="absolute left-6 top-24 z-20"
                >
                    <motion.div
                        animate={{y:[0,-6,0],rotate:[-4,2,-4],scale:[1,1.03,1]}}
                        transition={{duration:2.8,repeat:Infinity,ease:"easeInOut"}}
                        className="relative flex size-[190px] items-center justify-center"
                    >
                        <motion.div
                            animate={{
                                opacity:[0.25,0.55,0.25],
                                scale:[0.9,1.12,0.9],
                            }}
                            transition={{
                                duration:2.5,
                                repeat:Infinity,
                                ease:"easeInOut",
                            }}
                            className="absolute size-[175px] rounded-full border-4 border-[#6FC9B0]/40 dark:border-[#5eead4]/30"
                        />

                        <Brain className="relative z-10 size-[9rem] stroke-[1.7] text-[#0E7A5F] dark:text-[#5eead4]"/>
                    </motion.div>
                </motion.div>
                <svg
                    viewBox="0 0 340 260"
                    className="absolute left-0 top-10 z-10 h-[290px] w-full overflow-visible"
                    aria-hidden="true"
                >
                    <motion.path
                        d="M150 132 C205 118 222 88 292 78"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray="8 12"
                        className="text-[#6FC9B0] dark:text-[#5eead4]"
                        initial={{pathLength:0,opacity:0}}
                        animate={{pathLength:1,opacity:0.9}}
                        transition={{delay:0.65,duration:1,ease:[0.22,1,0.36,1]}}
                    />
                    <motion.path
                        d="M150 145 C208 158 235 178 302 185"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="5 13"
                        className="text-[#FFD166]"
                        initial={{pathLength:0,opacity:0}}
                        animate={{pathLength:1,opacity:0.8}}
                        transition={{delay:0.9,duration:1.1,ease:[0.22,1,0.36,1]}}
                    />
                    {hasKnowledgeStreak&&(
                        <motion.path
                            d="M148 154 C205 185 220 222 288 225"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray="8 12"
                            className="text-[#9B7EDE] dark:text-[#c5b3f0]"
                            initial={{pathLength:0,opacity:0}}
                            animate={{pathLength:1,opacity:0.85}}
                            transition={{delay:1.05,duration:1,ease:[0.22,1,0.36,1]}}
                        />
                    )}
                </svg>
                <motion.div
                    initial={{opacity:0,x:35,y:-10,scale:0.7}}
                    animate={{opacity:1,x:0,y:0,scale:1}}
                    transition={{delay:0.9,duration:0.65,ease:[0.22,1,0.36,1]}}
                    className="absolute right-3 top-10 z-30 text-right"
                >
                    <motion.p
                        initial={{opacity:0,scale:0.5}}
                        animate={{opacity:1,scale:1}}
                        transition={{delay:1.1,duration:0.45,ease:[0.22,1,0.36,1]}}
                        className="text-[5.6rem] font-extrabold leading-[0.82] tracking-[-0.09em] text-[#091828] dark:text-white"
                    >
                        {quizzesCompleted}
                    </motion.p>
                    <p className="mt-2 max-w-[120px] text-right text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#0E7A5F] dark:text-[#5eead4]">
                        {quizLabel} completed
                    </p>
                </motion.div>
                <motion.div
                    initial={{opacity:0,scale:0.4,x:-20,y:15,rotate:-16}}
                    animate={{
                        opacity:[0,1,1,0],
                        scale:[0.4,1,1,0.7],
                        x:[-20,28,94,145],
                        y:[15,-6,-34,-52],
                        rotate:[-16,-7,7,15],
                    }}
                    transition={{
                        delay:0.75,
                        duration:2.2,
                        repeat:Infinity,
                        repeatDelay:0.9,
                        ease:[0.22,1,0.36,1],
                    }}
                    className="absolute left-[41%] top-[147px] z-30 flex size-11 items-center justify-center rounded-[1rem] border-2 border-[#091828] bg-[#FFD9E1] shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#2d1b2e] dark:shadow-[3px_3px_0_#060e20]"
                >
                    <Check className="size-5 text-[#AC2A5D] dark:text-[#ff6b9d]"/>
                </motion.div>
                <motion.div
                    initial={{opacity:0,scale:0.4,x:-20,y:15,rotate:14}}
                    animate={{
                        opacity:[0,1,1,0],
                        scale:[0.4,1,1,0.7],
                        x:[-20,32,102,150],
                        y:[15,8,20,30],
                        rotate:[14,5,-5,-12],
                    }}
                    transition={{
                        delay:1.15,
                        duration:2.35,
                        repeat:Infinity,
                        repeatDelay:0.8,
                        ease:[0.22,1,0.36,1],
                    }}
                    className="absolute left-[40%] top-[167px] z-30 flex size-11 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFE9B5] shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#3a3118] dark:shadow-[3px_3px_0_#060e20]"
                >
                    <Sparkles className="size-5 text-[#7A5A00] dark:text-[#ffd166]"/>
                </motion.div>
                <motion.div
                    animate={{
                        opacity:[0,1,1,0],
                        x:[0,42,92,145],
                        y:[0,-10,-26,-38],
                        scale:[0.4,1,0.8,0.3],
                    }}
                    transition={{
                        delay:0.55,
                        duration:2,
                        repeat:Infinity,
                        repeatDelay:0.5,
                    }}
                    className="absolute left-[46%] top-[122px] z-20 size-3 rounded-full bg-[#FF6B9D]"
                />
                <motion.div
                    animate={{
                        opacity:[0,1,1,0],
                        x:[0,45,100,150],
                        y:[0,8,18,30],
                        scale:[0.3,0.9,0.7,0.2],
                    }}
                    transition={{
                        delay:1,
                        duration:2.15,
                        repeat:Infinity,
                        repeatDelay:0.4,
                    }}
                    className="absolute left-[47%] top-[165px] z-20 size-2.5 rounded-full bg-[#FFD166]"
                />
                <motion.div
                    animate={{
                        opacity:[0,1,1,0],
                        x:[0,38,88,140],
                        y:[0,-4,-12,-18],
                        scale:[0.35,1,0.8,0.25],
                    }}
                    transition={{
                        delay:1.45,
                        duration:2.1,
                        repeat:Infinity,
                        repeatDelay:0.55,
                    }}
                    className="absolute left-[45%] top-[145px] z-20 size-2 rounded-full bg-[#9B7EDE]"
                />
                {hasKnowledgeStreak&&(
                    <motion.div
                        initial={{opacity:0,x:30,scale:0.7,rotate:-8}}
                        animate={{opacity:1,x:0,scale:1,rotate:-3}}
                        transition={{delay:1.35,duration:0.6,ease:[0.22,1,0.36,1]}}
                        className="absolute bottom-[75px] right-0 z-30 flex items-center gap-3 rounded-[1.6rem] border-2 border-[#091828] bg-[#E8E4F4] px-4 py-3 shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#28223f] dark:shadow-[5px_5px_0_#060e20]"
                    >
                        <motion.div
                            animate={{rotate:[-8,8,-8],scale:[1,1.08,1]}}
                            transition={{duration:2.4,repeat:Infinity,ease:"easeInOut"}}
                        >
                            <Flame className="size-5 text-[#7B68B5] dark:text-[#c5b3f0]"/>
                        </motion.div>
                        <div>
                            <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#7B68B5] dark:text-[#c5b3f0]">
                                Knowledge streak
                            </p>
                            <p className="text-lg font-extrabold text-[#091828] dark:text-white">
                                {knowledgeStreakEnd} {dayLabel}
                            </p>
                        </div>
                    </motion.div>
                )}
                <motion.div
                    animate={{
                        x:[0,8,-4,0],
                        y:[0,-10,4,0],
                        rotate:[0,12,-5,0],
                        scale:[1,1.2,0.95,1],
                    }}
                    transition={{duration:3.1,repeat:Infinity,ease:"easeInOut"}}
                    className="absolute right-3 top-[178px] z-10 text-[#FFD166]"
                >
                    <Sparkles className="size-8"/>
                </motion.div>
                <motion.div
                    animate={{
                        x:[0,-7,5,0],
                        y:[0,8,-6,0],
                        rotate:[0,-14,8,0],
                        scale:[1,0.9,1.2,1],
                    }}
                    transition={{duration:3.5,repeat:Infinity,ease:"easeInOut"}}
                    className="absolute bottom-[78px] left-3 z-10 text-[#9B7EDE] dark:text-[#c5b3f0]"
                >
                    <Sparkles className="size-6"/>
                </motion.div>
            </div>
            <motion.div
                initial={{opacity:0,y:22}}
                animate={{opacity:1,y:0}}
                transition={{delay:1.3,duration:0.5}}
                className="text-center"
            >
                <p className="text-[2rem] font-extrabold leading-tight tracking-[-0.04em] text-[#091828] dark:text-white">
                    {hasQuizzes
                        ?`${quizzesCompleted} ${quizLabel} crushed.`
                        :"No quizzes completed."}
                </p>
                <motion.div
                    initial={{width:0}}
                    animate={{width:"52%"}}
                    transition={{delay:1.5,duration:0.7,ease:[0.22,1,0.36,1]}}
                    className="mx-auto mt-3 h-1.5 rounded-full bg-[#6FC9B0] dark:bg-[#5eead4]"
                />
                <motion.p
                    initial={{opacity:0,y:10}}
                    animate={{opacity:1,y:0}}
                    transition={{delay:1.7,duration:0.4}}
                    className="mx-auto mt-4 max-w-[280px] text-sm font-bold leading-relaxed text-[#777080] dark:text-[#a0aec0]"
                >
                    {hasKnowledgeStreak
                        ?`Learning kept flowing with a ${knowledgeStreakEnd}-${dayLabel} streak.`
                        :hasQuizzes
                            ?"You made time to sharpen your money knowledge."
                            :"Your next learning streak starts with one quiz."}
                </motion.p>
            </motion.div>
        </div>
    )
}