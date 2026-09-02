import * as React from "react"
import { useNavigate, Link } from "react-router-dom"
import { TrendingUp, Calendar as CalIcon, CheckCircle2, PieChart, Flame, AlertCircle, Info, ChevronLeft, Gift } from "lucide-react"
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
                    <Link
                        to="/wrapped"
                        className="flex min-w-[72px] flex-col items-center justify-center rounded-xl border-2 border-[#091828] bg-white px-3 py-2 shadow-[3px_3px_0_#091828] transition-transform hover:-translate-y-0.5 dark:border-[#060e20] dark:bg-white dark:shadow-[3px_3px_0_#060e20]"
                    >
                        <CategoryIcon tone="yellow"><Gift className="size-6" /></CategoryIcon>
                        <span className="mt-1 text-xs font-normal text-black">Wrapped</span>
                    </Link>

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

                        <div className="mt-6 space-y-3">
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