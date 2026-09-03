import * as React from "react"
import {motion} from "framer-motion"
import { useNavigate, Link } from "react-router-dom"
import { TrendingUp, Calendar as CalIcon, CheckCircle2, PieChart, Flame, AlertCircle, Info, ChevronLeft, Gift, Sparkles, ArrowRight } from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { SectionHeader } from "@/components/common/SectionHeader"
import { CategoryIcon } from "@/components/common/CategoryIcon"
import { useInsights } from "@/hooks/useInsights"
import type { InsightCard, InsightKey, InsightSeverity } from "@/features/insights/insightsApi"


const KEY_ICON: Record<InsightKey, React.ReactNode> = {
    "on-time-rate": <CheckCircle2 className="size-5" />,
    "obligation-trend": <TrendingUp className="size-5" />,
    "upcoming-pressure": <CalIcon className="size-5" />,
    "category-breakdown": <PieChart className="size-5" />,
    "payment-streak": <Flame className="size-5" />,
}

const SEVERITY_TONE: Record<InsightSeverity, "mint" | "yellow" | "pink"> = {
    positive: "mint",
    info: "yellow",
    warning: "pink",
    critical: "pink",
}

function iconFor(card: InsightCard): React.ReactNode {
    if (card.severity === "critical") return <AlertCircle className="size-5" />
    if (card.severity === "info" && card.value === "Not enough data") return <Info className="size-5" />
    return KEY_ICON[card.key]
}

function formatAsOf(iso: string | null): string | null {
    if (!iso) return null
    const d = new Date(iso)
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
}


export default function InsightsPage() {
    const nav = useNavigate()
    const { asOf, insights, loading, error, refetch } = useInsights()

    return (
        <div className="min-h-screen bg-[#f4fbf7] pb-24 dark:bg-[#0b1326]">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className="flex items-center gap-3">
                    <button type="button" aria-label="Go back" onClick={() => nav(-1)} className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#060e20]">
                        <ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]" />
                    </button>

                    <div className="flex flex-1 items-center justify-center">
                        <div
                            className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
                            style={{ transform: "rotate(-3deg)" }}>
                            <span className="text-base font-bold text-[#091828] dark:text-[#091828]">Insights</span>
                        </div>
                    </div>

                    <div aria-hidden="true" className="size-12 shrink-0" />

                </header>


                {loading && (
                    <p className="mt-8 text-center text-sm text-[#6B6375] dark:text-[#a0aec0]">Loading your insights...</p>
                )}

                {error && !loading && (
                    <div className="mt-8 text-center">
                        <p className="text-sm text-[#AC2A5D] dark:text-[#ff6b9d]">Couldn't load your insights</p>

                        <button type="button" onClick={refetch} className="mt-2 text-xs font-bold text-[#091828] underline dark:text-[#ffffff]">
                            Try Again
                        </button>
                    </div>

                )}

                {!loading && !error && (
                    <>
                        {formatAsOf(asOf) && (
                            <p className="mt-4 text-center text-xs text-[#6B6375] dark:text-[#a0aec0]">
                                As of {formatAsOf(asOf)}
                            </p>
                        )}

                        <Link
                            to="/wrapped"
                            className="relative mt-6 block overflow-hidden rounded-[2rem] border-2 border-[#091828] bg-[#FFD9E1] p-5 shadow-[6px_6px_0_#091828] transition-transform hover:-translate-y-1 dark:border-[#060e20] dark:bg-[#2d1b2e] dark:shadow-[6px_6px_0_#060e20]"
                        >
                            <motion.div
                                animate={{
                                    x:[0,-10,6,0],
                                    y:[0,8,-6,0],
                                    scale:[1,1.08,0.96,1],
                                }}
                                transition={{
                                    duration:7,
                                    repeat:Infinity,
                                    ease:"easeInOut",
                                }}
                                className="absolute -right-14 -top-14 size-40 rounded-full bg-[#FFE9B5] opacity-80 blur-[38px] dark:bg-[#493b18]"
                            />
                            <motion.div
                                animate={{
                                    x:[0,12,-8,0],
                                    y:[0,-10,6,0],
                                    scale:[1,1.1,0.95,1],
                                }}
                                transition={{
                                    duration:8,
                                    repeat:Infinity,
                                    ease:"easeInOut",
                                }}
                                className="absolute -bottom-16 -left-10 size-36 rounded-full bg-[#DCEFE8] opacity-90 blur-[42px] dark:bg-[#0f4f42]"
                            />
                            <div className="relative z-10">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="size-4 text-[#AC2A5D] dark:text-[#ff6b9d]" />
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#AC2A5D] dark:text-[#ff6b9d]">
                                                Monthly Wrapped
                                            </p>
                                        </div>
                                        <h2 className="mt-3 max-w-[250px] text-[2rem] font-extrabold leading-[0.95] tracking-[-0.04em] text-[#091828] dark:text-white">
                                            Your month,
                                            <br />
                                            in motion.
                                        </h2>
                                    </div>
                                    <div className="flex size-14 shrink-0 rotate-6 items-center justify-center rounded-[1.2rem] border-2 border-[#091828] bg-[#FFD166] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20]">
                                        <Gift className="size-6 text-[#7A5A00]" />
                                    </div>
                                </div>
                                <div className="mt-5 flex items-end justify-between gap-4">
                                    <p className="max-w-[240px] text-sm font-semibold leading-relaxed text-[#6B6375] dark:text-[#c6bccc]">
                                        Replay your payments, score progress, streaks, badges and learning highlights.
                                    </p>
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-white shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[3px_3px_0_#060e20]">
                                        <ArrowRight className="size-4 text-[#091828] dark:text-white" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <div className="mt-8 space-y-3">
                            <SectionHeader title="This Month" />

                            {insights.length === 0 ? (
                                <CustomCard variant="navyBorder" size="sm">
                                    <p className="text-sm text-[#6D6375] dark:text-[#a0aec0]">
                                        No insights available yet. Log payments to unlock your monthly summary.
                                    </p>
                                </CustomCard>
                            ) : (
                                insights.map((card, index) => (
                                    <InsightCardView key={`${card.key}-${index}`} card={card} />
                                ))
                            )}
                        </div>
                    </>
                )}

            </div>
        </div>



    )
}

function InsightCardView({
    card
}: Readonly<{
    card: InsightCard
}>) {
    const tone = SEVERITY_TONE[card.severity]
    const icon = iconFor(card)

    const inner = (
        <CustomCard variant="navyBorder" size="sm" className="flex items-start gap-3">
            <CategoryIcon tone={tone}>{icon}</CategoryIcon>

            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#a0aec0]">{card.title}</p>
                <p className="mt-0.5 text-lg font-extrabold text-[#091828] dark:text-[#ffffff]">{card.value}</p>
                <p className="mt-1 text-sm text-[#6B6375] dark:text-[#a0aec0]">{card.explanation}</p>
            </div>
        </CustomCard>
    )
    return card.link ? <Link to={card.link}>{inner}</Link> : inner
}