import * as React from "react"
import {Gift} from "lucide-react"
 
import {CustomCard} from "@/components/ui/CustomCard"
import {LongButton} from "@/components/common/LongButton"
import {SubPageShell} from "@/components/common/SubPageShell"
import {getLatestWrapped, type WrappedSummary} from "@/features/profile/profileApi"

//monthly wrapped (similar to spotify wrapped)
//placeholder data until endpoints exist
//not for demo 2, possibly implement for demo 3

export default function WrappedPage(){
    const[wrapped, setWrapped]=React.useState<WrappedSummary | null>(null)

    React.useEffect(() => {
        //TODO: enable when GET /wrapped/latest exists

        void getLatestWrapped
        void setWrapped
    }, [])

    return (
        <SubPageShell title="Wrapped" subtitle="Your monthly highlights">
            <CustomCard variant= "navyBorder" size="md" className ="bg-[#E8E4F4] text-center dark:bg-[#1c263c]">
                <div className ="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-[#5B4D8B] dark:bg-[#131b2e]">
                    <Gift className ="size-6"/>
                </div>

                <p className ="mt-3 text-lg font-extrabold text-[#091828] dark:text-[#ffffff]">You crushed it this month</p>
                <p className ="mt-1 text-xs text-[#6B6375] dark:text-[#a0aec0]">
                    {wrapped ? wrapped.month: "Stats will appear once data is available"}
                </p>

            </CustomCard>

            <div className = "grid grid-cols-2 gap-3">
                <StatCard label="Total Saved" value={wrapped ? 'R ${wrapped.totalSaved.toLocaleString()}' : "-"}/>
                <StatCard label="Transactions" value={wrapped ? String(wrapped.transactions) : "-"}/>
                <StatCard label="Top Category" value={wrapped?.topCategory ?? "-"}/>
                <StatCard label="No-Spend Days" value={wrapped ? String(wrapped.noSpendDays) : "-"}/>


            </div>

            {/*TODO: month picker and sharing with friends */}

            <LongButton LongVariant ="primaryDark" LongSize="md" showArrow={false} className="dark:bg-[#ffb1c5] dark:text-[#650030] dark:hover:bg-[#ffc4d4]">
                Share Your Wrap

            </LongButton>

        </SubPageShell>
    )
}


function StatCard({
    label,
    value,
}: Readonly <{
    label: string
    value: string
}>) {
    return (
        <CustomCard variant ="navyBorder" size="sm" className="text-center">
            <p className ="text-lg font-extrabold text-[#091828] dark:text-[#ffffff]">{value}</p>
            <p className ="mt-0.5 text-xs text-[#6B6375] dark:text-[#a0aec0]">{label}</p>
        </CustomCard>
    )
}