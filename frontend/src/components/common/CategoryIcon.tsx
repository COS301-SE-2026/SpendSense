import * as React from "react"
import { cn } from "@/lib/utils"

const SIZE_CLASS={
    sm:"size-7",
    md:"size-10",
} as const
export function CategoryIcon({
    tone,
    size = "md",
    children,
}: {
    tone: "mint" | "lilac" | "pink" | "yellow" | "navy"
    size?:keyof typeof SIZE_CLASS
    children: React.ReactNode
}) {
    const toneClass: Record<typeof tone, string> = {
        mint: "bg-[#DCEFE8] text-[#091828]",
        lilac: "bg-[#E8E4F4] text-[#5b4d8b]",
        pink: "bg-[#FFD8E6] text-[#ac2a5d]",
        yellow: "bg-[#FFE9B5] text-[#7a5a00]",
        navy: "bg-[#0a1929] text-white",
    }
    return (
        <div
            className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                SIZE_CLASS[size],
                toneClass[tone],
            )}
        >
            {children}
        </div>
    )
}