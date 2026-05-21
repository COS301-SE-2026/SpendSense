import * as React from "react"
import { Link } from "react-router-dom"
import {
	Home,
	Calendar as CalendarIcon,
	Trophy,
	User,
	ShoppingBag,
} from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { SparklesIcon, FireIcon, SunriseIcon } from "@hugeicons/core-free-icons"
import { AddTransactionButton } from "@/components/common/AddTransactionButton"
import { CustomCard } from "@/components/ui/CustomCard"
import { Progress } from "@/components/ui/progress"
import { Sticker } from "@/components/ui/sticker"

import { CreditScoreGauge } from "@/components/common/CreditScoreGauge"
import { CustomBadge } from "@/components/common/CustomBadges"
import { IconButton } from "@/components/common/IconButton"
import { LongButton } from "@/components/common/LongButton"
import { XpPill } from "@/components/common/XpPill"

import { cn } from "@/lib/utils"

import { UpcomingPaymentsCard } from "@/components/dashboard/UpcomingPaymentsCard"
import { CreditStatsSection } from "@/components/dashboard/CreditStats"
import { getDashboard } from "@/features/dashboard/dashboardApi"

import type { DashboardData } from "@/types/DashboardTypes"

export default function DashboardPage() {


	const [dashboard, setDashboard] = React.useState<DashboardData | null>(null)


	// loading and detting the dashboard 
	React.useEffect(() => {
		async function loadDashboard() {
			try {
				const response = await getDashboard()
				console.log("getDashboard response: ", response)
				setDashboard(response.data)

			} catch (error) {
				console.error("getDashboard response: ", error)
			}
		}
		loadDashboard()

		function test() {
			console.log("Test")

		}
		test()
	}, [])


	const userSummary = dashboard?.userSummary
	const creditProfile = dashboard?.creditProfile
	const gamificationProfile = dashboard?.gamificationProfile
	const upcomingPayments = dashboard?.upcomingPayments ?? []

	const name = userSummary?.displayName

	const score_ = creditProfile?.currentScore ?? 0
	const level_ = gamificationProfile?.mascotLevel ?? 1
	const streakDays_ = gamificationProfile?.currentPaymentStreak ?? 0

	const xp = {
		current: gamificationProfile?.xp ?? 0,
		next: 1200,
		nextLevel: (gamificationProfile?.mascotLevel ?? 1) + 1,
	}

	return (
		<div className="min-h-screen bg-[#F4FBF7] pb-24">
			<div className="mx-auto w-full max-w-md px-5 pt-6">

				<header className="flex items-start justify-between gap-3">
					<div>
						<h1 className="text-3xl font-extrabold leading-tight text-[#091828]">
							Hey<br />{name}
						</h1>
					</div>

					<div className="relative">
						<IconButton
							IconVariant="iconNotif"
							aria-label="Notifications"
						/>
						<span
							aria-hidden="true"
							className="pointer-events-none absolute right-1 top-1 size-2.5 rounded-full bg-[#FF6B9D] ring-2 ring-[#F4FBF7]"
						/>
					</div>
				</header>

            <CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm">

				<div className="flex justify-center">
					<CreditScoreGauge score={score_} max={850} size="lg" />
				</div>

				<div className="mt-3 flex items-center justify-center gap-2 flex-wrap">

					<CustomBadge variant="streak" size="md"> {streakDays_} day streak </CustomBadge>
					<CustomBadge variant="level" size="md"> Lvl {level_} </CustomBadge>
					<Sticker tone="yellow" shape="squircle" size="sm" tilt="right">
						<span className="px-2 text-[10px] font-bold tracking-wide text-[#091828]"> Early Bird </span>
					</Sticker>

				</div>

            </CustomCard>

			<CreditStatsSection creditProfile={creditProfile} />


				<section aria-label="Experience progress" className="mt-5" >

					<div className="flex items-center justify-between text-xs font-semibold text-[#091828]">
						<span>{xp.current.toLocaleString()} / {xp.next.toLocaleString()} XP</span>
						<span className="text-[#6b6375]">Next Level: {xp.nextLevel}</span>
					</div>

					<Progress
						value={(xp.current / xp.next) * 100 }
						className="mt-2 h-2.5"
						aria-label={`${xp.current} of ${xp.next} XP earned`}
					/>

					<div className="mt-4 flex items-center justify-between gap-3">
						<XpPill amount={xp.current} className="shrink-0" />
						<span className="text-xs font-medium text-[#6b6375]">
							Next reward unlocked soon
						</span>
					</div>

				</section>

				<UpcomingPaymentsCard upcomingPayments={upcomingPayments} />

            <CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <SectionHeader title="Recent Activity" meta="Last logged 2h ago" />
    
            <div className="mt-4 rounded-2xl bg-[#F4FBF7] p-4">
                <div className="flex items-center gap-3">
                <CategoryIcon tone="lilac">
                    <ShoppingBag className="size-5" />
                </CategoryIcon>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#091828]">Supermarket Store</p>
                </div>
                <p className="text-base font-extrabold text-[#ac2a5d]">−R 12.50</p>
                </div>
            </div>
    
            <LongButton
                LongVariant="primaryDark"
                LongSize="md"
                className="mt-4"
                showArrow={false}
                asChild
            >
                <Link to="/transactions">See all transactions</Link>
            </LongButton>
            </CustomCard>

				<CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm">

					<SectionHeader title="Stickers" meta="24 collected · 32 to go" />

					<div className="mt-4 grid grid-cols-4 justify-items-center gap-3">
						<Sticker tone="pink" shape="circle" size="lg" tilt="left">
							<HugeiconsIcon icon={SparklesIcon} size={44} color="currentColor" strokeWidth={1.5} />
						</Sticker>
						<Sticker tone="yellow" shape="circle" size="lg" tilt="right">
							<HugeiconsIcon icon={FireIcon} size={44} color="currentColor" strokeWidth={1.5} />
						</Sticker>
						<Sticker tone="mint" shape="circle" size="lg" tilt="left">
							<HugeiconsIcon icon={SunriseIcon} size={44} color="currentColor" strokeWidth={1.5} />
						</Sticker>
						<Sticker tone="slate" shape="circle" size="lg" state="locked" />
					</div>

					<LongButton
						LongVariant="primaryYellow"
						LongSize="md"
						className="mt-4"
						showArrow={false}
						asChild
					>
						<Link to="/stickers">Open album</Link>
					</LongButton>
				</CustomCard>

			</div>

			<BottomNav active="home" />
		</div>
	)
}


function SectionHeader({
	title,
	meta,
}: {
	title: string
	meta?: string
}) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<h2 className="text-lg font-extrabold text-[#091828]">{title}</h2>
			{meta && (
				<span className="text-xs font-medium text-[#6b6375]">{meta}</span>
			)}
		</div>
	)
}


function CategoryIcon({
	tone,
	children,
}: {
	tone: "mint" | "lilac" | "pink" | "yellow" | "navy"
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
				"flex size-10 shrink-0 items-center justify-center rounded-full",
				toneClass[tone],
			)}
		>
			{children}
		</div>
	)
}




type BottomNavTab = "home" | "calendar" | "quests" | "profile"

function BottomNav({ active }: { active: BottomNavTab }) {
	return (
		<nav
			aria-label="Primary"
			className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E4F4] bg-white/95 backdrop-blur"
		>
			<div className="mx-auto flex w-full max-w-md items-center justify-around px-4 py-2">
				<BottomNavItem to="/" icon={<Home className="size-5" />} label="Home" active={active === "home"} />
				<BottomNavItem to="/calendar" icon={<CalendarIcon className="size-5" />} label="Calendar" active={active === "calendar"} />

				{/* Floating + action */}
				<AddTransactionButton />

				<BottomNavItem to="/quests" icon={<Trophy className="size-5" />} label="Quests" active={active === "quests"} disabled={true} />
				<BottomNavItem to="/profile" icon={<User className="size-5" />} label="Profile" active={active === "profile"} disabled={true} />
			</div>
		</nav>
	)
}

function BottomNavItem({
	to,
	icon,
	label,
	active,
	disabled,
}: {
	to: string
	icon: React.ReactNode
	label: string
	active: boolean
	disabled?: boolean
}) {
	return (
		<Link
			to={to}
			aria-disabled={disabled}
			onClick={(e) => {
				if (disabled) {
					e.preventDefault();
				}
			}}
			className={cn(
				"flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
				active
					? "bg-[#FFD8E6] text-[#ac2a5d]"
					: "text-[#6b6375] hover:text-[#091828]",
				disabled && "opacity-35 pointer-events-none cursor-not-allowed select-none"
			)}
			aria-current={active ? "page" : undefined}
		>
			{icon}
			<span>{label}</span>
		</Link>
	)
}