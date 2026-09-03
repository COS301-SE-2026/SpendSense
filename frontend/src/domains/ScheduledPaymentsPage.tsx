import * as React from "react"
import {useNavigate} from "react-router-dom"
import {AlertTriangle} from "lucide-react"

import {CustomCard} from "@/components/ui/CustomCard"
import {SubPageShell} from "@/components/common/SubPageShell"
import {BottomNav} from "@/components/common/BottomNav"
import {cn} from "@/lib/utils"

import {getOccurrenceDetail} from "@/features/payments/paymentsApi"
import {
	BADGE_STYLES,
	formatCurrency,
	iconBgForType,
	isPayable,
	type OccurrenceStatus,
} from "@/features/payments/occurrenceDisplay"
import { ObligationInitial } from "@/components/common/ObligationInitial"

import {
	findAnchorMonthKey,
	getMonthKey,
	useScheduledPayments,
	type ScheduledPaymentMonth,
} from "@/hooks/useScheduledPayments"
import type {CalendarOccurrence} from "@/hooks/useCalendarOccurrences"

const PEEK_ABOVE_PX = 56

export default function ScheduledPaymentsPage(){
	const navigate = useNavigate()
	const {months, loading, error} = useScheduledPayments()
	const [tappingId, setTappingId] = React.useState<string | null>(null)

	const currentMonthKey = React.useMemo(()=> getMonthKey(new Date()), [])
	const anchorKey = React.useMemo(
		()=> findAnchorMonthKey(months, new Date()),
		[months],
	)

	const anchorRef = React.useRef<HTMLElement | null>(null)
	const hasScrolledToAnchor = React.useRef(false)


	React.useEffect(()=> {
		if(hasScrolledToAnchor.current) return
		if(loading || !anchorKey || !anchorRef.current) return

		hasScrolledToAnchor.current = true

		anchorRef.current.scrollIntoView?.({block: "start"})
		window.scrollBy?.(0, -PEEK_ABOVE_PX)
	}, [loading, anchorKey])

	
	async function handleTap(occurrence: CalendarOccurrence){
		if(!isPayable(occurrence.status as OccurrenceStatus)) return

		setTappingId(occurrence.id)
		try{
			const detail = await getOccurrenceDetail(occurrence.id)
			navigate("/paymentForm", {
				state:{
					occurrence: detail.occurrence,
					obligation: detail.obligation,
					scoreRisk: detail.scoreRisk,
				},
			})
		}
		catch(err){
			console.error("Failed to load occurrence detail, falling back to list data:", err)
			navigate("/paymentForm", {
				state:{
					occurrence:{
						id: occurrence.id,
						dueDate: occurrence.dueDate,
						amountDue: occurrence.amountDue,
						currency: occurrence.currency,
						status: occurrence.status,
						sequenceNumber: occurrence.sequenceNumber,
						paidAt: null,
						overdueAt: null,
						missedAt: null,
					},
					obligation: occurrence.obligation,
					scoreRisk: null,
				},
			})
		}
		finally{
			setTappingId(null)
		}
	}

	return (
		<>
			<SubPageShell title="Scheduled Payments" subtitle="Everything on your schedule, month by month" stickyHeader>
				{error && (
					<div className="flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFD9E1] px-4 py-3 dark:border-[#ffb4ab] dark:bg-[#93000a]/30">
						<AlertTriangle className="size-4 shrink-0 text-[#AC2A5D] dark:text-[#ffb4ab]" />
						<p className="text-sm font-semibold text-[#AC2A5D] dark:text-[#ffb4ab]">{error}</p>
					</div>
				)}

				{loading && (
					<output aria-label="Loading scheduled payments" className="flex flex-col gap-3">
						{Array.from({length: 4}).map((_, index)=> (
							<div key={index} className="h-20 animate-pulse rounded-3xl bg-[#E3EAE6] dark:bg-[#1c263c]" />
						))}
					</output>
				)}

				{!loading && !error && months.length === 0 && (
					<p className="py-6 text-center text-sm text-[#6b6375] dark:text-[#a0aec0]">
						Nothing scheduled yet. Add an obligation to start building your schedule.
					</p>
				)}

				{!loading && months.map((month)=> (
					<MonthSection
						key={month.key}
						month={month}
						isCurrent={month.key === currentMonthKey}
						sectionRef={month.key === anchorKey ? anchorRef : undefined}
						tappingId={tappingId}
						onTap={handleTap}
					/>
				))}
			</SubPageShell>

			<BottomNav active="calendar" />
		</>
	)
}


function MonthSection({
	month,
	isCurrent,
	sectionRef,
	tappingId,
	onTap,
}: Readonly<{
	month: ScheduledPaymentMonth
	isCurrent: boolean
	sectionRef?: React.RefObject<HTMLElement | null>
	tappingId: string | null
	onTap: (occurrence: CalendarOccurrence)=> void
}>){
	return (
		<section
			ref={sectionRef}
			aria-label={month.label}
			className="mt-2 scroll-mt-4"
			data-testid={`month-${month.key}`}
			data-current={isCurrent}
		>
			<div className="mb-2 flex items-baseline justify-between px-1">
				<h2 className="flex items-baseline gap-2 text-sm font-extrabold uppercase tracking-wide text-[#091828] dark:text-white">
					{month.label}
					{isCurrent && (
						<span className="rounded-full bg-[#FFD9E1] px-2 py-0.5 text-[9px] font-bold tracking-normal text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]">
							This month
						</span>
					)}
				</h2>
				<span className="text-xs font-bold text-[#6b6375] dark:text-[#a0aec0]">
					{formatCurrency(month.total)}
				</span>
			</div>

			{month.occurrences.length === 0 ? (
				<p className="py-4 text-center text-sm text-[#6b6375] dark:text-[#a0aec0]">
					Nothing scheduled this month.
				</p>
			) : (
				<div className="flex flex-col gap-2">
					{month.occurrences.map((occurrence)=> (
						<ScheduleRow
							key={occurrence.id}
							occurrence={occurrence}
							isTapping={tappingId === occurrence.id}
							onTap={()=> onTap(occurrence)}
						/>
					))}
				</div>
			)}
		</section>
	)
}


function ScheduleRow({
	occurrence,
	isTapping,
	onTap,
}: Readonly<{
	occurrence: CalendarOccurrence
	isTapping: boolean
	onTap: ()=> void
}>){
	const status = occurrence.status as OccurrenceStatus
	const badge = BADGE_STYLES[status] ?? BADGE_STYLES.PENDING
	const payable = isPayable(status)

	const due = new Date(occurrence.dueDate)
	const dayLabel = due.toLocaleDateString("en-ZA", {day: "numeric", month: "short", timeZone: "UTC"})

	return (
		<CustomCard className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-sm dark:border-[#060e20] dark:bg-[#131b2e]">
			<button
				type="button"
				disabled={!payable || isTapping}
				onClick={onTap}
				className={cn("w-full text-left", payable && !isTapping ? "cursor-pointer" : "cursor-default")}
				aria-label={
					payable
						? `Pay ${occurrence.obligation.name}, due ${dayLabel}, ${formatCurrency(occurrence.amountDue)}`
						: `${occurrence.obligation.name}, due ${dayLabel}, ${badge.label}`
				}
			>
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] dark:border-[#060e20]",
							iconBgForType(occurrence.obligation.type),
						)}
					>
						{isTapping
							? <div className="size-5 animate-spin rounded-full border-2 border-[#091828] border-t-transparent" />
							: <ObligationInitial type={occurrence.obligation.type} />
						}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<p className="truncate text-sm font-bold text-[#091828] dark:text-white">
								{occurrence.obligation.name}
							</p>
							<span className="shrink-0 text-[10px] font-semibold text-[#6b6375] dark:text-[#a0aec0]">
								{dayLabel}
							</span>
						</div>

						<div className="mt-1 flex items-center gap-2">
							<span className={cn("inline-block rounded-full border border-[#091828] px-2 py-0.5 dark:border-[#060e20]", badge.bg)}>
								<span className={cn("text-[10px] font-bold", badge.text)}>{badge.label}</span>
							</span>
							{payable && !isTapping && (
								<span className="text-[10px] font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">Tap to pay →</span>
							)}
						</div>
					</div>

					<p className={cn(
						"shrink-0 text-base font-extrabold",
						status === "OVERDUE" || status === "MISSED"
							? "text-[#AC2A5D] dark:text-[#ffb4ab]"
							: "text-[#091828] dark:text-white",
					)}>
						{formatCurrency(occurrence.amountDue)}
					</p>
				</div>
			</button>
		</CustomCard>
	)
}