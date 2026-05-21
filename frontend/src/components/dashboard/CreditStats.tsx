import { CustomCard } from "@/components/ui/CustomCard"

type CreditProfile = {
    scoreTier?: string
    onTimePaymentCount?: number
    latePaymentCount?: number
    missedPaymentCount?: number
    currentUtilisationScore?: string | number | null
}

type CreditStatsSectionProps = {
    creditProfile?: CreditProfile | null
}

export function CreditStatsSection({
    creditProfile,
}: CreditStatsSectionProps) {

    const scoreTier = creditProfile?.scoreTier ?? "UNKNOWN"

    return (
        <CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375]">
                    Score Tier
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-[#091828]">
                    {scoreTier}
                </h2>
            </div>

        </CustomCard>
    )
}



