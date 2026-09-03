import * as React from "react"
import {cn} from "@/lib/utils"
 
//small stat tile, three to a row. used for a friend's tier/streak/
//badges and for a wager's stake/pot/duration.

const TONE_STYLES = {
	default: "text-[#091828] dark:text-white",
	mint: "text-[#5eead4] dark:text-[#5eead4]",
	yellow: "text-[#ffd166] dark:text-[#ffd166]",
	pink: "text-[#AC2A5D] dark:text-[#ffb4ab]",
} as const
 
export type StatTileTone = keyof typeof TONE_STYLES
 
export function StatTile({
	label,
	value,
	icon,
	tone = "default",
}: Readonly<{
	label: string
	value: string | number
	icon?: React.ReactNode
	tone?: StatTileTone
}>) {
	return (
		<div className="rounded-xl border-2 border-[#091828] bg-white px-2 py-3 text-center dark:border-[#2d3449] dark:bg-[#1c263c]">
			<p
				className={cn(
					"flex items-center justify-center gap-1 text-base font-extrabold",
					TONE_STYLES[tone],
				)}
			>
				{icon}
				{value}
			</p>
			<p className="text-[11px] text-[#6B6375] dark:text-[#a0aec0]">{label}</p>
		</div>
	)
}
 