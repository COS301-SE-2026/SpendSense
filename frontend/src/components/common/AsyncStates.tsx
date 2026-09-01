import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"

//loading / error / empty states shared by every friends page, so a failed
//fetch looks the same everywhere instead of each page inventing its own.

export function LoadingCard({ label = "Loading..." }: Readonly<{ label?: string }>) {
	return (
		<CustomCard variant="navyBorder" size="sm">
			<div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
				<span className="sr-only">{label}</span>
				{[0, 1, 2].map((row) => (
					<div key={row} className="flex items-center gap-3">
						<div className="size-11 shrink-0 animate-pulse rounded-full bg-[#E3EAE6] dark:bg-[#1c263c]" />
						<div className="flex-1 space-y-2">
							<div className="h-3 w-1/2 animate-pulse rounded-full bg-[#E3EAE6] dark:bg-[#1c263c]" />
							<div className="h-2.5 w-1/3 animate-pulse rounded-full bg-[#EDF2EF] dark:bg-[#1c263c]" />
						</div>
					</div>
				))}
			</div>
		</CustomCard>
	)
}

export function ErrorCard({
	message,
	onRetry,
}: Readonly<{
	message: string
	onRetry?: () => void
}>) {
	return (
		<CustomCard variant="navyBorder" size="sm">
			<div className="flex items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FCE0E8] text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]">
					<AlertCircle className="size-5" />
				</div>

				<div className="min-w-0 flex-1">
					<p className="text-sm font-bold text-[#091828] dark:text-white">
						Oops, something went wrong
					</p>
					<p className="mt-0.5 text-xs text-[#6B6375] dark:text-[#a0aec0]">{message}</p>

					{onRetry && (
						<button
							type="button"
							onClick={onRetry}
							className="mt-3 flex items-center gap-1.5 rounded-full border-2 border-[#091828] bg-white px-3 py-1.5 text-xs font-bold text-[#091828] transition active:translate-x-[2px] active:translate-y-[2px] dark:border-[#2d3449] dark:bg-[#1c263c] dark:text-white"
						>
							<RefreshCw className="size-3.5" />
							Please try again
						</button>
					)}
				</div>
			</div>
		</CustomCard>
	)
}

export function EmptyCard({
	icon,
	title,
	description,
	action,
	className,
}: Readonly<{
	icon: React.ReactNode
	title: string
	description: string
	action?: React.ReactNode
	className?: string
}>) {
	return (
		<CustomCard variant="navyBorder" size="sm" className={className}>
			<div className="flex items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8] text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]">
					{icon}
				</div>

				<div className="min-w-0 flex-1">
					<p className="text-sm font-bold text-[#091828] dark:text-white">{title}</p>
					<p className="mt-0.5 text-xs text-[#6B6375] dark:text-[#a0aec0]">
						{description}
					</p>
					{action && <div className="mt-3">{action}</div>}
				</div>
			</div>
		</CustomCard>
	)
}