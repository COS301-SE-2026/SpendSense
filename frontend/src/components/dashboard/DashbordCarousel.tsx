import * as React from "react"
import { Link } from "react-router-dom"
import {
    ChevronLeft,
    ChevronRight,
    Gift,
    Images,
    Target,
    TrendingUp,
    CheckCircle,
    Sparkles,
    Flame,
    Sun,
    Circle,
} from "lucide-react"

import { cn } from "@/lib/utils"

type CarouselSlide = "wrapped" | "quests" | "insights" | "stickers"

type DashboardCarouselProps = {
    stickersCollected?: number
    stickersTotal?: number
}

export function DashboardCarousel({ stickersCollected, stickersTotal, }: DashboardCarouselProps) {

    const showWrapped = isFirstWeekOfMonth()
    const wrappedMonth = getPreviousMonthLabel()

    const slides: CarouselSlide[] = [
        ...(showWrapped ? (["wrapped"] as CarouselSlide[]) : []),
        "quests",
        "insights",
        "stickers",
    ]

    const [activeIndex, setActiveIndex] = React.useState(0)
    const swipeStartXRef = React.useRef<number | null>(null)
    const didSwipeRef = React.useRef(false)
    const trackRef = React.useRef<HTMLDivElement>(null)

    const triggerPop = () => {
        const track = trackRef.current
        if (!track) {
            return
        }

        track.classList.remove("is-popping")
        void track.offsetWidth
        track.classList.add("is-popping")
    }

    const goTo = (index: number) => {
        const nextIndex = (index + slides.length) % slides.length
        setActiveIndex(nextIndex)
        triggerPop()
    }
    const goPrevious = () => {
        goTo(activeIndex - 1)
    }
    const goNext = () => {
        goTo(activeIndex + 1)
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        swipeStartXRef.current = event.clientX
        didSwipeRef.current = false
    }

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (swipeStartXRef.current === null) {
            return
        }
        const distance = event.clientX - swipeStartXRef.current
        if (Math.abs(distance) > 40) {
            didSwipeRef.current = true
            if (distance < 0) {
                goNext()
            } else {
                goPrevious()
            }
        }
        swipeStartXRef.current = null
    }

    const handlePointerCancel = () => {
        swipeStartXRef.current = null
    }

    const handleCardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (!didSwipeRef.current) {
            return
        }
        event.preventDefault()
        didSwipeRef.current = false
    }

    const hasStickerCounts = typeof stickersCollected === "number" && typeof stickersTotal === "number"
    const stickersRemaining = hasStickerCounts ? Math.max(stickersTotal - stickersCollected, 0) : 0

    return (
        <section className="mt-6" aria-label="Dashboard feature cards">
            <div className="mb-3 flex items-end justify-between px-0.5">
                <h2 className="text-lg font-extrabold text-[#091828] dark:text-white">Your progress hub</h2>
                <p className="text-[11px] font-semibold text-[#6B6375] dark:text-[#a0aec0]">
                    Swipe to explore
                </p>
            </div>

            <div className="touch-pan-y overflow-hidden rounded-[24px] p-1 pb-2" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel}>
                <div ref={trackRef} className="dashboard-carousel-track flex items-stretch gap-4 transition-transform duration-500 ease-[cubic-bezier(.22,.8,.25,1)]"
                    style={{ transform: `translateX(calc(-${activeIndex * 100}% - ${activeIndex}rem))` }}
                >
                    {slides.map((slide, index) => (
                        <CarouselCard key={slide} slide={slide} wrappedMonth={wrappedMonth} hasStickerCounts={hasStickerCounts} stickersCollected={stickersCollected ?? 0} stickersRemaining={stickersRemaining} tilt={index % 2 === 0 ? "left" : "right"} onClick={handleCardClick} />
                    ))}
                </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-3" aria-label="Feature carousel controls">
                <button
                    type="button"
                    onClick={goPrevious}
                    aria-label="Previous feature"
                    className="flex size-8 items-center justify-center rounded-full bg-white text-[#091828] shadow-[0_3px_10px_rgba(9,24,40,0.09)] transition active:scale-95 dark:bg-[#1c263c] dark:text-white"
                >
                    <ChevronLeft className="size-4" />
                </button>

                <div className="flex items-center gap-1.5">
                    {slides.map((slide, index) => {
                        const active = index === activeIndex
                        return (
                            <button
                                key={slide}
                                type="button"
                                onClick={() => goTo(index)}
                                aria-label={`Show ${slide}`}
                                aria-current={active ? "true" : undefined}
                                className={cn("h-[7px] rounded-full transition-all", active ? "w-[19px] bg-[#B42F62] dark:bg-[#ff6b9d]" : "w-[7px] bg-[#D8CBD3] dark:bg-[#475569]")}
                            />
                        )
                    })}
                </div>

                <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next feature"
                    className=" flex size-8 items-center justify-center rounded-full bg-white text-[#091828] shadow-[0_3px_10px_rgba(9,24,40,0.09)] transition active:scale-95 dark:bg-[#1c263c] dark:text-white"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>
        </section>
    )
}

function CarouselCard({ slide, wrappedMonth, hasStickerCounts, stickersCollected, stickersRemaining, tilt, onClick, }: {
    slide: CarouselSlide
    wrappedMonth: string
    hasStickerCounts: boolean
    stickersCollected: number
    stickersRemaining: number
    tilt: "left" | "right"
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void
}) {
    const sharedClass = cn(
        "block h-[220px] w-full min-w-0 flex-[0_0_100%] overflow-hidden rounded-[22px]",
        "border-2 border-[#091828]",
        "p-4 text-[#091828]",
        "shadow-[4px_5px_0_#091828]",
        "transition-all",
        "hover:shadow-[5px_6px_0_#091828]",
        "active:translate-x-[3px]",
        "active:translate-y-[4px]",
        "active:shadow-none",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-[#FF6B9D]",
        "focus-visible:ring-offset-2",
        "dark:border-[#060e20]",
        "dark:shadow-[4px_5px_0_#060e20]",
        "dashboard-carousel-slide",
    )

    const tiltValue = slide === "wrapped" ? "-1.1deg" : tilt === "left" ? "-0.8deg" : "0.8deg"
    const slideStyle = { "--dashboard-carousel-tilt": tiltValue } as React.CSSProperties

    switch (slide) {

        case "wrapped":
            return (
                <Link
                    to="/wrapped"
                    onClick={onClick}
                    className={cn(sharedClass, "bg-[#FFD9E1]", "dark:bg-[#2d1b2e]")}
                    style={slideStyle}
                    aria-label={`Open ${wrappedMonth} Wrapped`}
                >
                    <div className="flex items-center gap-3">
                        <SlideIcon tone="yellow"><Gift className="size-5" /></SlideIcon>
                        <p className="flex-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#7A5A00] dark:text-[#FFD166]">Your month in SpendSense</p>
                        <ChevronRight className="size-5 text-[#7A5A00] dark:text-[#FFD166]" />
                    </div>

                    <h3 className="mt-2 text-[21px] font-extrabold leading-[0.98]">
                        <span className="text-[13px] uppercase tracking-[0.14em] text-[#7A5A00] dark:text-[#FFD166]">Your</span>
                        <br />
                        {wrappedMonth} Wrapped
                    </h3>

                    <div className=" mt-2 h-[5px] w-36 rounded-full bg-gradient-to-r from-[#D09B28] via-[#FFF3B0] to-[#FFDC8A]" aria-hidden="true" />
                    <p className="mt-2 text-xs leading-relaxed text-[#6B6375] dark:text-[#d0c5d4]">
                        Your payments, progress and rewards from the month, all in one place.
                    </p>
                </Link>
            )

        case "quests":
            return (
                <Link
                    to="/quests"
                    onClick={onClick}
                    className={cn(sharedClass, "bg-white dark:bg-[#131b2e] dark:text-white")}
                    style={slideStyle}
                >
                    <div className="flex items-center gap-3">
                        <SlideIcon tone="lilac"><Target className="size-5" /></SlideIcon>
                        <p className="flex-1 text-[11px] font-black uppercase tracking-[0.12em]"> Quests</p>
                        <span className=" rounded-full border border-[#091828] bg-[#FFDC8A] px-2 py-1 text-[10px] font-black shadow-[2px_3px_0_#091828] dark:border-[#060e20] dark:text-[#091828] dark:shadow-[2px_3px_0_#060e20]">+50 XP</span>
                        <ChevronRight className="size-5 text-[#6B6375] dark:text-[#a0aec0]" />
                    </div>

                    <h3 className="mt-2 text-lg font-extrabold leading-tight">Choose your next quest</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#6B6375] dark:text-[#a0aec0]">Build your money knowledge and collect rewards as you go!</p>

                    <div className=" mt-2 flex items-center gap-2 rounded-2xl border border-[#FFD8E6] bg-[#FFF7F9] px-2.5 py-1.5 dark:border-[#ff6b9d]/30 dark:bg-[#1c263c]">
                        <span className="flex size-6 items-center justify-center rounded-full bg-[#FFD8E6] text-[#AC2A5D]">
                            <CheckCircle className="size-3.5" />
                        </span>
                        <strong className="flex-1 text-[11px]">Daily Quiz</strong>
                        <span className="text-[10px] font-bold text-[#6B6375] dark:text-[#a0aec0]">Start learning</span>
                    </div>

                </Link>
            )

        case "insights":
            return (
                <Link
                    to="/insights"
                    onClick={onClick}
                    className={cn(sharedClass, "bg-white dark:bg-[#131b2e] dark:text-white")}
                    style={slideStyle}
                >
                    <div className="flex items-center gap-3">
                        <SlideIcon tone="pink"><TrendingUp className="size-5" /></SlideIcon>
                        <p className="flex-1 text-[11px] font-black uppercase tracking-[0.12em]">Insights</p>
                        <ChevronRight className="size-5 text-[#6B6375] dark:text-[#a0aec0]" />
                    </div>

                    <h3 className="mt-3 text-lg font-extrabold leading-tight">See where your money is moving</h3>

                    <p className="mt-1 text-xs leading-relaxed text-[#6B6375] dark:text-[#a0aec0]">
                        Review your latest spending patterns and find useful next steps.
                    </p>
                </Link>
            )

        case "stickers":
            return (
                <Link
                    to="/stickers"
                    onClick={onClick}
                    className={cn(sharedClass, "bg-white dark:bg-[#131b2e] dark:text-white")}
                    style={slideStyle}
                >
                    <div className="flex items-center gap-3">
                        <SlideIcon tone="yellow"> <Images className="size-5" /> </SlideIcon>
                        <p className="flex-1 text-[11px] font-black uppercase tracking-[0.12em]"> Stickers</p>
                        {hasStickerCounts && stickersCollected !== undefined && (
                            <span className="whitespace-nowrap text-[10px] font-semibold text-[#6B6375] dark:text-[#a0aec0]">
                                {stickersCollected} collected! {stickersRemaining} to go
                            </span>
                        )}
                        <ChevronRight className="size-5 text-[#6B6375] dark:text-[#a0aec0]" />
                    </div>

                    <div className="mt-3 flex items-baseline justify-between gap-3">
                        <h3 className="text-lg font-extrabold">Sticker album</h3>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-[#6B6375] dark:text-[#a0aec0]">
                        Open your album to see the stickers you have earned.
                    </p>

                    <StickerPreview />

                </Link>
            )
    }
}

function StickerPreview() {
    return (
        <div className="mt-4 flex items-center gap-2" data-testid="sticker-preview" aria-hidden="true">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#FFD9E1] text-[#AC2A5D] dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]">
                <Sparkles className="size-5" />
            </span>
            <span className="flex size-10 items-center justify-center rounded-full bg-[#DCEFE8] text-[#16635A] dark:bg-[#12463d] dark:text-[#7fd8c4]">
                <Flame className="size-5" />
            </span>
            <span className="flex size-10 items-center justify-center rounded-full bg-[#DCD5F4] text-[#5B4D8B] dark:bg-[#2a2545] dark:text-[#c5b3f0]">
                <Sun className="size-5" />
            </span>
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-[#AEB8B2] text-[#AEB8B2] dark:border-[#64748b] dark:text-[#64748b]">
                <Circle className="size-4" />
            </span>
        </div>
    )
}

function SlideIcon({ tone, children }: { tone: "pink" | "yellow" | "lilac", children: React.ReactNode }) {
    const toneClass = {
        pink: "bg-[#FFD8E6] text-[#AC2A5D] dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]",
        yellow: "bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#ffd166]/20 dark:text-[#ffd166]",
        lilac: "bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#9B7EDE]/20 dark:text-[#c5b3f0]",
    }
    return (
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", toneClass[tone])}>
            {children}
        </span>
    )
}

function isFirstWeekOfMonth(date = new Date()) {
    return date.getDate() <= 7
}

function getPreviousMonthLabel(date = new Date()) {
    const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    return previousMonth.toLocaleString("en-ZA", { month: "long" })
}
