import { CustomCard } from "@/components/ui/CustomCard"
import type { CreditScore } from "@/types/credit-scoreTypes"

type CreditProfile = {
    scoreTier?: string
    onTimePaymentCount?: number
    latePaymentCount?: number
    missedPaymentCount?: number
    currentUtilisationScore?: string | number | null
}

type CreditStatsSectionProps = {
    creditProfile?: CreditProfile | null
    creditScore?: CreditScore | null
}



export function CreditStatsSection({
    creditScore,
}: CreditStatsSectionProps) {

    const scoreTier = creditScore?.creditScoreTier?? "UNKNOWN"
    const onTimePaymentCount = creditScore?.onTimePaymentCount ?? 0
    const latePaymentCount = creditScore?.onLatePaymentCount ?? 0
    const utilisationRaw = creditScore?.savingsBuffer ?? 0
    const utilisationPercentage = `${(utilisationRaw * 100)}%`

    return (

        <CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm">

            <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375]">
                    Score Tier
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-[#091828]">
                    {scoreTier}
                </h2>

                <div className="mt-5 grid grid-cols-3 gap-3">
                    <CredtiStatsBox label="On-time Payments" value={onTimePaymentCount} />
                    <CredtiStatsBox label="Savings Buffer" value={utilisationPercentage} />
                    <CredtiStatsBox label="Late Payments" value={latePaymentCount} />
                </div>
            </div>

        </CustomCard>
    )
}

function CredtiStatsBox({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="rounded-2xl bg-[#F4FBF7] px-3 py-4 text-center ">
            <p className="text-lg font-extrabold text-[#091828]">
                {value}
            </p>

            <p className="mt-1 text-[11px] font-semibold text-[#6b6375]">
                {label}
            </p>
        </div>
    )
}