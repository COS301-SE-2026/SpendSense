import * as React from "react"
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react"
import { StreakFlame } from "@/components/common/StreakFlame"
import { StreakTicks } from "@/components/common/StreakTicks"
import { cn } from "@/lib/utils"

export interface StreakPanel{
    key: string
    title: string
    days: number
    best: number
    icon: LucideIcon
}

const SWIPE_THRESHOLD_PX = 40

export function StreakCarousel({
    panels,
    className,
}:Readonly<{
    panels: StreakPanel[]
    className?: string
}>) {
    const [index, setIndex] = React.useState(0)
    const touchStartX = React.useRef<number | null>(null)

    const count = panels.length
	const active = panels[index]

    const goTo = React.useCallback((next: number)=> {
		setIndex((next + count) % count)
	}, [count])

    const goPrevious = ()=> goTo(index - 1)
	const goNext = ()=> goTo(index + 1)

    function handleTouchStart(event: React.TouchEvent){
		touchStartX.current = event.touches[0]?.clientX ?? null
	}

    function handleTouchEnd(event: React.TouchEvent){
		const start = touchStartX.current
		const end = event.changedTouches[0]?.clientX
 
		touchStartX.current = null
		if(start === null || end === undefined) return
 
		const distance = end - start
		if(Math.abs(distance) < SWIPE_THRESHOLD_PX) return
 
		goTo(distance < 0 ? index + 1 : index - 1)
	}

    function handleKeyDown(event: React.KeyboardEvent){
		if(event.key === "ArrowLeft"){
			event.preventDefault()
			goPrevious()
		}
		if(event.key === "ArrowRight"){
			event.preventDefault()
			goNext()
		}
	}

    if(count === 0) return null

    return (
        <div
			className={cn("relative w-full max-w-[280px]", className)}
			role="group"
			aria-roledescription="carousel"
			aria-label="Streaks"
			onKeyDown={handleKeyDown}
		>
            <div
				className="overflow-hidden rounded-2xl bg-[#FFF4F7] dark:bg-[#1c263c]"
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
				data-testid="streak-carousel-viewport"
			>

              <div
					className="flex transition-transform duration-300 ease-out"
					style={{transform: `translateX(-${index * 100}%)`}}
				>
                   {panels.map((panel, panelIndex)=> {
						const Icon = panel.icon
						const isActive = panelIndex === index
                        
                        return(
                            <div
								key={panel.key}
								className="flex w-full shrink-0 flex-col items-center px-9 py-4"
								role="group"
								aria-roledescription="slide"
								aria-label={`${panel.title}, ${panelIndex + 1} of ${count}`}
								// keeps the offscreen panel out of the reading order
								aria-hidden={!isActive}
								data-testid={`streak-panel-${panel.key}`}
							>
                               <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#ff6b9d]">
									<Icon className="size-3.5" aria-hidden="true" />
									{panel.title}
								</p>

                                 <StreakFlame days={panel.days} label="days" size="sm" />
 
								<StreakTicks
									total={7}
									completed={Array.from(
										{length: Math.min(panel.days, 7)},
										(_, tickIndex)=> tickIndex,
									)}
									size="sm"
									aria-label={`${panel.days} day ${panel.title.toLowerCase()}`}
								/>

                                <p className="mt-2 text-[10px] font-semibold text-[#6b6375] dark:text-[#a0aec0]">
									Best: {panel.best} {panel.best === 1 ? "day" : "days"}
								</p>
                            </div>

                        )
                   })}
                </div>  
            </div>

            {count >1 && (
                <>
                    <button
						type="button"
						onClick={goPrevious}
						aria-label="Show previous streak"
						className="absolute left-0 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#AC2A5D] shadow-sm transition hover:bg-[#FFD9E1] active:translate-x-[1px] dark:bg-[#131b2e] dark:text-[#ff6b9d] dark:hover:bg-[#2d1b2e]"
					>
						<ChevronLeft className="size-4" />
					</button>

                    <button
						type="button"
						onClick={goNext}
						aria-label="Show next streak"
						className="absolute right-0 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#AC2A5D] shadow-sm transition hover:bg-[#FFD9E1] active:translate-x-[1px] dark:bg-[#131b2e] dark:text-[#ff6b9d] dark:hover:bg-[#2d1b2e]"
					>
						<ChevronRight className="size-4" />
					</button>

                    <div className="mt-2 flex items-center justify-center gap-1.5">
						{panels.map((panel, panelIndex)=> (
							<button
								key={panel.key}
								type="button"
								onClick={()=> goTo(panelIndex)}
								aria-label={`Show ${panel.title}`}
								aria-current={panelIndex === index}
								className={cn(
									"size-2 rounded-full transition-colors",
									panelIndex === index
										? "bg-[#AC2A5D] dark:bg-[#ff6b9d]"
										: "bg-[#E3D5DA] dark:bg-[#2d3449]",
								)}
							/>
						))}
					</div>

                    <p className="sr-only" aria-live="polite">
						{active.title}, {active.days} days
					</p>

                </>
            )}
        </div>
    )
}