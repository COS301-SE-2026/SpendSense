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
        <CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <SectionHeader title="Coming Up" meta={`${upcomingPayments.length} upcoming payments`} />

            <div className="mt-4 space-y-3">
                {
                    upcomingPayments.length > 0 ?
                        (upcomingPayments.slice(0, 3).map((payment) => (<UpcomingPaymentItem key={payment.id} payment={payment} />)))
                        :
                        (
                            <div className="rounded-2xl bg-[#F4FBF7] p-4">
                                <p className="text-sm font-semibold text-[#6b6375]"> No upcoming payments </p>
                            </div>
                        )
                }
            </div>

            <LongButton LongVariant="primaryDark" LongSize="md" className="mt-4" showArrow={false} asChild >
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
        <div className="mt-4 rounded-2xl bg-[#F4FBF7] p-4">

            <div className="flex items-center gap-3">

                <CategoryIcon tone="mint"> <Wifi className="size-5" /> </CategoryIcon>

                <div className="flex-1 min-w-0">

                    <p className="text-sm font-bold text-[#091828]"> {name} </p>

                    <div className="mt-1">
                        <CustomBadge variant="streak" size="sm"> {status} </CustomBadge>
                    </div>

                </div>

                <p className="text-base font-extrabold text-[#ac2a5d]"> {currency} {amount} </p>
            </div>

        </div>
    )
}