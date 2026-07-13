import * as React from "react"
import {useNavigate} from "react-router-dom"
import {TrendingUp, Calendar as CalIcon, CheckCircle2} from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { SectionHeader } from "@/components/common/SectionHeader"
import { CategoryIcon } from "@/components/common/CategoryIcon"
import { IconButton } from "@/components/common/IconButton"


export default function InsightsPage(){
    const nav = useNavigate()

    return(
        <div className = "min-h-screen bg-[#f4fbf7] pb-24">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className = "flex items-center justify-between">
                    <IconButton IconVariant="iconBack" aria-label = "Go back" onClick = {() => nav(-1)}/>
                    <h1 className = "text-lg font-bold text-[#091828]">Insights</h1>
                    <div className="size-10"/>
                </header>

                <CustomCard className = "mt-6 rounded-3xl bg-white p-5 shadow-sm">
                    <SectionHeader title = "Spending Overview" meta = "This Week"/>

                    <div className="mt-4 text-center">
                        <p className="text-3xl font-black text-[#091828]">R 0.00</p> {/* placeholder here for the amount */}
                        <p className="text-xs font-medium text-[#6b6375]">Total Spent</p>
                    </div>

                    <div className="mt-5 space-y-3">
                        <CategoryRow cat = "Food" percent = {35}/>
                        <CategoryRow cat = "Transport" percent = {27}/>
                        <CategoryRow cat = "Bills" percent = {38}/>
                    </div>

                </CustomCard>


                <div className="mt-6 space-y-3">
                    <SectionHeader title="This Week"/>
                    <InsightCard
                        tone = "pink"
                        icon = {<TrendingUp className="size-5"/>}
                        title = "Spending on food has increased"
                        message = "10% more was spent on Food this week than last week."
                    />
                    <InsightCard
                        tone = "yellow"
                        icon = {<CalIcon className="size-5"/>}
                        title = "3 payments due soon"
                        message = "There are 3 payments due within the next 7 days."
                    />
                    <InsightCard
                        tone = "mint"
                        icon = {<CheckCircle2 className="size-5"/>}
                        title = "Good payment streak"
                        message = "Your last 5 payments have been paid on time."
                    />
                </div>

            </div>
        </div>

    )
}



function CategoryRow({cat, percent}: {cat: string, percent: number}){
    return(
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[#091828]">
                <span>{cat}</span>
                <span className="text-[#6b6375]">{percent}%</span>
            </div>

            <div className="h-2 w-full rounded-full bg-[#d9ede7] overflow-hidden">
                <div className="h-full rounded-full bg-[#3dbfa0]" style={{width: `${percent}%`}}/>
            </div>
        </div>
    )
}

function InsightCard({tone, icon, title, message,}: Readonly<{
    tone: "mint"|"lilac"|"pink"|"yellow"
    icon: React.ReactNode
    title: string
    message: string}>)
{
    return(
        <CustomCard variant="navyBorder" size="sm" className="flex items-start gap-3">
            <CategoryIcon tone={tone}>{icon}</CategoryIcon>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#091828]">{title}</p>
                <p className="text-sm text-[#6b6375] mt-0.5">{message}</p>
            </div>
            {/* TODO: add in a "dismiss" button once we have actual insights here */}
        </CustomCard>
    )

}