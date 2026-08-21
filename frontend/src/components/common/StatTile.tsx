import * as React from "react"
 
//small stat tile, three to a row. used for a friend's tier/streak/
//badges and for a wager's stake/pot/duration.
 
export function StatTile({
	label,
	value,
	icon,
}: Readonly<{
	label: string
	value: string | number
	icon?: React.ReactNode
}>) {
	return (
		<div className="rounded-xl border-2 border-[#091828] bg-white px-2 py-3 text-center dark:border-[#2d3449] dark:bg-[#1c263c]">
			<p className="flex items-center justify-center gap-1 text-base font-extrabold text-[#091828] dark:text-white">
				{icon}
				{value}
			</p>
			<p className="text-[11px] text-[#6B6375] dark:text-[#a0aec0]">{label}</p>
		</div>
	)
}
 