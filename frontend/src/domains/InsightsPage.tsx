import * as React from "react"
import {useNavigate, Link} from "react-router-dom"
import {TrendingUp, Calendar as CalIcon, CheckCircle2, PieChart, Flame, AlertCircle, Info} from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { SectionHeader } from "@/components/common/SectionHeader"
import { CategoryIcon } from "@/components/common/CategoryIcon"
import { ChevronLeft } from "lucide-react"
import {useInsights} from "@/hooks/useInsights"
import type {InsightCard, InsightKey, InsightSeverity} from "@/features/insights/insightsApi"


const KEY_ICON: Record<InsightKey, React.ReactNode>={
    "on-time-rate": <CheckCircle2 className="size-5"/>,
    "obligation-trend": <TrendingUp className="size-5"/>,
    "upcoming-pressure": <CalIcon className="size-5"/>,
    "category-breakdown": <PieChart className="size-5"/>,
    "payment-streak":<Flame className="size-5"/>,
}

const SEVERITY_TONE: Record<InsightSeverity, "mint"|"yellow"|"pink">={
    positive:"mint",
    info: "yellow",
    warning: "pink",
    critical: "pink",
}

function iconFor(card: InsightCard): React.ReactNode{
    if(card.severity === "critical") return <AlertCircle className="size-5"/>
    if(card.severity === "info" && card.value === "Not enough data") return <Info className="size-5"/>
    return KEY_ICON[card.key]
}

function formatAsOf(iso: string|null): string|null{
    if(!iso) return null
    const d=new Date(iso)
    return d.toLocaleDateString("en-ZA", {day: "numeric", month: "long", year: "numeric"})
}


export default function InsightsPage(){
    const nav = useNavigate()
    const {asOf, insights, loading, error, refetch}=useInsights()

    return(
        <div className = "min-h-screen bg-[#f4fbf7] pb-24">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className ="flex items-center gap-3">
                    <button 
                        type ="button" 
                        aria-label="Back"
                        onClick={() => nav(-1)}
                        className = "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828]">

                            <ChevronLeft className="size-5 text-[#6E0034]" />
                        </button>

                        <div className= "flex flex-1 items-center justify-center">
                            <div className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828]" style={{transform: "rotate(-3deg)"}}>
                                <span className="text-base font-bold text-[#091828]">Insights</span>
                            </div>
                        </div>

                        <div aria-hidden="true" className="size-12 shrink-0"/>

                </header>


                {loading && (
                    <p className="mt-8 text-center text-sm text-[#6B6375]">Loading your insights...</p>
                )}

                {error && !loading && (
                    <div className="mt-8 text-center">
                        <p className ="text-sm text-[#AC2A5D]">Couldn't load your insights</p>

                        <button type="button" onClick={refetch} className="mt-2 text-xs font-bold text-[#091828] underline">
                            Try Again
                        </button>
                    </div>

                )}

                {!loading && !error &&(
                    <>
                        {formatAsOf(asOf) && (
                            <p className="mt-4 text-center text-xs text-[#6B6375]">
                                As of {formatAsOf(asOf)}
                            </p>
                        )}

                        <div className="mt-6 space-y-3">
                            <SectionHeader title="This Month"/>

                            {insights.length === 0 ? (
                                <CustomCard variant="navyBorder" size="sm">
                                    <p className="text-sm text-[#6D6375]">
                                        No insights available yet. Log payments to unlock your monthly summary.
                                    </p>
                                </CustomCard>
                            ): (
                                insights.map((card)=> (
                                    <InsightCardView key={card.key} card={card}/>
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
}>){
    const tone=SEVERITY_TONE[card.severity]
    const icon = iconFor(card)

    const inner=(
        <CustomCard variant="navyBorder" size="sm" className="flex items-start gap-3">
            <CategoryIcon tone={tone}>{icon}</CategoryIcon>

            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6B6375]">{card.title}</p>
                <p className="mt-0.5 text-lg font-extrabold text-[#091828]">{card.value}</p>
                <p className="mt-1 text-sm text-[#6B6375]">{card.explanation}</p>
            </div>
        </CustomCard>
    )
    return card.link ? <Link to={card.link}>{inner}</Link> :inner
}



// function CategoryRow({cat, percent}: {cat: string, percent: number}){
//     return(
//         <div className="space-y-1">
//             <div className="flex items-center justify-between text-xs font-semibold text-[#091828]">
//                 <span>{cat}</span>
//                 <span className="text-[#6b6375]">{percent}%</span>
//             </div>

//             <div className="h-2 w-full rounded-full bg-[#d9ede7] overflow-hidden">
//                 <div className="h-full rounded-full bg-[#3dbfa0]" style={{width: `${percent}%`}}/>
//             </div>
//         </div>
//     )
// }

// function InsightCard({tone, icon, title, message,}: Readonly<{
//     tone: "mint"|"lilac"|"pink"|"yellow"
//     icon: React.ReactNode
//     title: string
//     message: string}>)
// {
//     return(
//         <CustomCard variant="navyBorder" size="sm" className="flex items-start gap-3">
//             <CategoryIcon tone={tone}>{icon}</CategoryIcon>

//             <div className="min-w-0 flex-1">
//                 <p className="text-sm font-bold text-[#091828]">{title}</p>
//                 <p className="text-sm text-[#6b6375] mt-0.5">{message}</p>
//             </div>
//             {/* TODO: add in a "dismiss" button once we have actual insights here */}
//         </CustomCard>
//     )

// }