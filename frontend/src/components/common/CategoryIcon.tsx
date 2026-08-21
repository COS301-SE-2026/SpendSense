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
        mint: "bg-[#DCEFE8] text-[#091828] dark:bg-[#131b2e] dark:text-[#a0aec0]",
        lilac: "bg-[#E8E4F4] text-[#5b4d8b] dark:bg-[#131b2e] dark:text-[#a0aec0]",
        pink: "bg-[#FFD8E6] text-[#ac2a5d] dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]",
        yellow: "bg-[#FFE9B5] text-[#7a5a00] dark:bg-[#ffd166]/20 dark:text-[#ffd166]",
        navy: "bg-[#0a1929] text-white dark:bg-[#1c263c]",
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