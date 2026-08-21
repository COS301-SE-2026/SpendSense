import { Link } from "react-router-dom"
import { Wifi } from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { CustomBadge } from "@/components/common/CustomBadges"
import { LongButton } from "@/components/common/LongButton"
import { SectionHeader } from "@/components/common/SectionHeader"
import { CategoryIcon } from "@/components/common/CategoryIcon"
import type { DashboardPayment } from "@/types/DashboardTypes"




type UpcomingPaymentsCardProps = {
    upcomingPayments: DashboardPayment[]
}


// function for the upcoming payments JSX
export function UpcomingPaymentsCard({ upcomingPayments }: UpcomingPaymentsCardProps) {
    return (
        <CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm dark:bg-[#131b2e] dark:shadow-lg dark:shadow-black/20">
            <SectionHeader title="Coming Up" meta={`${upcomingPayments.length} upcoming payments`} />

            <div className="mt-4 space-y-3">
                {
                    upcomingPayments.length > 0 ?
                        (upcomingPayments.slice(0, 3).map((payment) => (<UpcomingPaymentItem key={payment.id} payment={payment} />)))
                        :
                        (
                            <div className="rounded-2xl bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
                                <p className="text-sm font-semibold text-[#6b6375] dark:text-[#a0aec0]"> No upcoming payments </p>
                            </div>
                        )
                }
            </div>

            <LongButton LongVariant="primaryDark" LongSize="md" className="mt-4 dark:bg-[#1e293b] dark:hover:bg-[#334155]" showArrow={false} asChild >
                <Link to="/calendar">View calendar</Link>
            </LongButton>
        </CustomCard>
    )
}

function UpcomingPaymentItem({ payment }: { payment: DashboardPayment }) {

    const name = payment?.obligation?.name ?? "unamed ayment"
    const status = payment?.status ?? "UNKNOWN"
    const amount = Number(payment?.amountDue ?? 0).toFixed(2)
    const currency = payment?.currency === "ZAR" ? "R" : payment?.currency ?? "R"

    return (
        <div className="mt-4 rounded-2xl bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">

            <div className="flex items-center gap-3">

                <CategoryIcon tone="mint"> <Wifi className="size-5" /> </CategoryIcon>

                <div className="flex-1 min-w-0">

                    <p className="text-sm font-bold text-[#091828] dark:text-white"> {name} </p>

                    <div className="mt-1">
                        <CustomBadge variant="streak" size="sm" className="dark:border dark:border-solid dark:border-[#ff6b9d]/30 dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"> {status} </CustomBadge>
                    </div>

                </div>

                <p className="text-base font-extrabold text-[#ac2a5d] dark:text-[#ff6b9d]"> {currency} {amount} </p>
            </div>

        </div>
    )
}