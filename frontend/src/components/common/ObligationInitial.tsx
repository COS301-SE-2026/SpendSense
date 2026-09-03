export function ObligationInitial({
    type
}: Readonly<{
    type: string
}>) {
    const letters: Record<string, string> = {
        RENT: "R",
        SUBSCRIPTION: "S",
        UTILITY: "U",
        BNPL: "B",
        IOU: "I",
        CUSTOM: "C",
    }

    return (
        <span className="text-sm font-bold text-[#091828]">
            {letters[type] ?? "?"}
        </span>
    )
}