import {motion} from "framer-motion"
import {
    Award,
    BookOpen,
    CheckCircle,
    Flame,
    Sparkles,
    Star,
    TrendingUp,
} from "lucide-react"
import {Sticker} from "@/components/ui/sticker"
import type {WrappedBadge} from "@/features/profile/profileApi"

type BadgesSlideProps={
    numberBadgesEarned:number
    arrayBadgesEarned:WrappedBadge[]
}

const stickerPositions=[
    {x:-125,y:-72,rotate:-12},
    {x:-118,y:58,rotate:9},
    {x:104,y:-72,rotate:11},
    {x:116,y:58,rotate:-8},
    {x:0,y:-120,rotate:6},
]

function StickerIcon({iconKey}:Readonly<{iconKey:string|null}>){
    switch(iconKey){
        case "check":
        case "check-circle":
        case "first-payment":
            return <CheckCircle className="size-9"/>
        case "flame":
        case "payment-streak":
            return <Flame className="size-9"/>
        case "trending-up":
            return <TrendingUp className="size-9"/>
        case "book-open":
            return <BookOpen className="size-9"/>
        case "sparkles":
        case "plus-circle":
            return <Sparkles className="size-9"/>
        default:
            return <Star className="size-9"/>
    }
}

function stickerTone(badgeKey:string){
    if(badgeKey.includes("PAYMENT")){
        return "mint" as const
    }

    if(badgeKey.includes("STREAK")){
        return "hotpink" as const
    }

    if(badgeKey.includes("QUIZ")||badgeKey.includes("KNOWLEDGE")){
        return "blue" as const
    }

    if(badgeKey.includes("SCORE")){
        return "yellow" as const
    }

    return "pink" as const
}

export default function BadgesSlide({
    numberBadgesEarned,
    arrayBadgesEarned,
}:Readonly<BadgesSlideProps>){
    const badges=arrayBadgesEarned.slice(0,5)
    const hasBadges=numberBadgesEarned>0
    const badgeLabel=numberBadgesEarned===1?"badge":"badges"

    return(
        <div className="relative flex min-h-[68vh] w-full flex-col justify-center">
            <motion.div
                initial={{opacity:0,y:-16}}
                animate={{opacity:1,y:0}}
                transition={{duration:0.45}}
                className="flex items-center gap-2"
            >
                <Award className="size-4 text-[#AC2A5D] dark:text-[#ff6b9d]"/>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#AC2A5D] dark:text-[#ff6b9d]">
                    Sticker haul
                </p>
            </motion.div>

            <motion.h1
                initial={{opacity:0,y:24}}
                animate={{opacity:1,y:0}}
                transition={{delay:0.1,duration:0.55,ease:[0.22,1,0.36,1]}}
                className="mt-5 max-w-[330px] text-[3rem] font-extrabold leading-[0.95] tracking-[-0.05em] text-[#091828] dark:text-white"
            >
                Your collection grew.
            </motion.h1>

            <div className="relative mt-5 flex min-h-[340px] items-center justify-center">
                <motion.div
                    initial={{opacity:0,scale:0.6}}
                    animate={{opacity:1,scale:[1,1.04,1]}}
                    transition={{
                        opacity:{delay:0.2,duration:0.5},
                        scale:{
                            delay:0.8,
                            duration:2.8,
                            repeat:Infinity,
                            ease:"easeInOut",
                        },
                    }}
                    className="absolute size-[270px] rounded-[47%_53%_57%_43%/48%_44%_56%_52%] bg-[#FFF0D8] dark:bg-[#3b2d14]"
                />

                {badges.map((badge,index)=>{
                    const position=stickerPositions[index]??stickerPositions[0]

                    return(
                        <motion.div
                            key={badge.badgeKey}
                            initial={{
                                opacity:0,
                                x:position.x,
                                y:position.y,
                                rotate:position.rotate,
                                scale:0.5,
                            }}
                            animate={{
                                opacity:1,
                                x:position.x*0.45,
                                y:position.y*0.45,
                                rotate:position.rotate/2,
                                scale:1,
                            }}
                            transition={{
                                delay:0.3+index*0.25,
                                duration:0.8,
                                ease:[0.22,1,0.36,1],
                            }}
                            className="absolute z-20"
                        >
                            <motion.div
                                animate={{
                                    y:[0,-6,0],
                                    rotate:[
                                        position.rotate/2,
                                        position.rotate/2+4,
                                        position.rotate/2,
                                    ],
                                }}
                                transition={{
                                    duration:2.5+index*0.3,
                                    repeat:Infinity,
                                    ease:"easeInOut",
                                }}
                            >
                                <Sticker
                                    tone={stickerTone(badge.badgeKey)}
                                    shape="circle"
                                    size="lg"
                                    state="earned"
                                    tilt="none"
                                    aria-label={badge.name}
                                    className="flex items-center justify-center"
                                >
                                    <StickerIcon iconKey={badge.iconKey}/>
                                </Sticker>
                            </motion.div>
                        </motion.div>
                    )
                })}

                <motion.div
                    initial={{opacity:0,scale:0.4}}
                    animate={{opacity:1,scale:1}}
                    transition={{
                        delay:0.9,
                        duration:0.6,
                        ease:[0.22,1,0.36,1],
                    }}
                    className="relative z-10 flex size-[150px] flex-col items-center justify-center rounded-full border-2 border-[#091828] bg-white shadow-[6px_6px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[6px_6px_0_#060e20]"
                >
                    <motion.p
                        initial={{scale:0.6}}
                        animate={{scale:[1,1.08,1]}}
                        transition={{
                            delay:1.1,
                            duration:1.8,
                            repeat:Infinity,
                            ease:"easeInOut",
                        }}
                        className="text-[3rem] font-extrabold leading-none tracking-[-0.06em] text-[#091828] dark:text-white"
                    >
                        +{numberBadgesEarned}
                    </motion.p>

                    <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#AC2A5D] dark:text-[#ff6b9d]">
                        {badgeLabel}
                    </p>
                </motion.div>

                <motion.div
                    animate={{
                        x:[0,8,-4,0],
                        y:[0,-10,4,0],
                        rotate:[0,12,-5,0],
                        scale:[1,1.2,0.95,1],
                    }}
                    transition={{
                        duration:3.1,
                        repeat:Infinity,
                        ease:"easeInOut",
                    }}
                    className="absolute right-2 top-8 z-10 text-[#FF6B9D]"
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
                    transition={{
                        duration:3.5,
                        repeat:Infinity,
                        ease:"easeInOut",
                    }}
                    className="absolute bottom-11 left-4 z-10 text-[#9B7EDE] dark:text-[#c5b3f0]"
                >
                    <Sparkles className="size-6"/>
                </motion.div>

                <motion.div
                    animate={{
                        opacity:[0,1,0],
                        y:[8,-15,-34],
                        scale:[0.4,1,0.3],
                    }}
                    transition={{
                        delay:1,
                        duration:1.7,
                        repeat:Infinity,
                        repeatDelay:0.8,
                    }}
                    className="absolute left-[48%] top-[48px] size-3 rounded-full bg-[#FF6B9D]"
                />

                <motion.div
                    animate={{
                        opacity:[0,1,0],
                        y:[8,-18,-38],
                        x:[0,6,8],
                        scale:[0.3,0.9,0.2],
                    }}
                    transition={{
                        delay:1.6,
                        duration:1.9,
                        repeat:Infinity,
                        repeatDelay:0.7,
                    }}
                    className="absolute right-[34%] top-[63px] size-2.5 rounded-full bg-[#FFD166]"
                />
            </div>

            <motion.div
                initial={{opacity:0,y:24,scale:0.92}}
                animate={{opacity:1,y:0,scale:1}}
                transition={{
                    delay:1.25,
                    duration:0.55,
                    ease:[0.22,1,0.36,1],
                }}
                className="text-center"
            >
                <p className="text-[2rem] font-extrabold leading-tight tracking-[-0.04em] text-[#091828] dark:text-white">
                    {hasBadges
                        ?`${numberBadgesEarned} new ${badgeLabel} unlocked`
                        :"No new badges"}
                </p>

                <motion.div
                    initial={{width:0}}
                    animate={{width:"54%"}}
                    transition={{
                        delay:1.45,
                        duration:0.7,
                        ease:[0.22,1,0.36,1],
                    }}
                    className="mx-auto mt-3 h-1.5 rounded-full bg-[#FF6B9D]"
                />

                <motion.p
                    initial={{opacity:0,y:10}}
                    animate={{opacity:1,y:0}}
                    transition={{delay:1.65,duration:0.4}}
                    className="mx-auto mt-4 max-w-[275px] text-sm font-bold leading-relaxed text-[#777080] dark:text-[#a0aec0]"
                >
                    {hasBadges
                        ?"New stickers joined your collection this month."
                        :"No new stickers joined your collection this month."}
                </motion.p>
            </motion.div>

            {badges.length>0&&(
                <motion.div
                    initial={{opacity:0,y:18}}
                    animate={{opacity:1,y:0}}
                    transition={{delay:1.85,duration:0.45}}
                    className="mt-5 flex justify-center gap-5"
                >
                    {badges.map((badge)=>(
                        <div
                            key={`earned-${badge.badgeKey}`}
                            className="flex max-w-[110px] flex-col items-center gap-2"
                        >
                            <Sticker
                                tone={stickerTone(badge.badgeKey)}
                                shape="circle"
                                size="md"
                                state="earned"
                                tilt="none"
                                aria-label={badge.name}
                                className="flex items-center justify-center"
                            >
                                <StickerIcon iconKey={badge.iconKey}/>
                            </Sticker>

                            <p className="text-center text-[10px] font-extrabold leading-tight text-[#091828] dark:text-white">
                                {badge.name}
                            </p>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
    )
}