import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import {
	Home,
	Calendar as CalendarIcon,
	Trophy,
	User,
	LogOut,
    TrendingUp,
    ChevronRight,
} from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { SparklesIcon, FireIcon, SunriseIcon } from "@hugeicons/core-free-icons"
import { AddTransactionButton } from "@/components/common/AddTransactionButton"
import { CustomCard } from "@/components/ui/CustomCard"
import { Progress } from "@/components/ui/progress"
import { Sticker } from "@/components/ui/sticker"

import { CreditScoreGauge } from "@/components/common/CreditScoreGauge"
import { CustomBadge } from "@/components/common/CustomBadges"
import { LongButton } from "@/components/common/LongButton"
import { XpPill } from "@/components/common/XpPill"
import { NotificationBell } from "@/components/notifications/NotificationBell"

import { cn } from "@/lib/utils"

import { UpcomingPaymentsCard } from "@/components/dashboard/UpcomingPaymentsCard"
import { CreditStatsSection } from "@/components/dashboard/CreditStats"
import { getDashboard } from "@/features/dashboard/dashboardApi"
import { signOut } from "@/features/auth/auth.service"
import { useNotifications } from "@/features/notifications/useNotifications"

import type { DashboardData } from "@/types/DashboardTypes"
import type { CreditScore } from "@/types/credit-scoreTypes"
import { getCrditScore } from "@/features/credit-score/credit-scoreApi"
import { StreakFlame } from "@/components/common/StreakFlame"
import { StreakTicks } from "@/components/common/StreakTicks"
import { BottomNav } from "@/components/common/BottomNav"

export default function DashboardPage() {
	const navigate = useNavigate()
	const {clearUnreadCount}=useNotifications()

	const [dashboard, setDashboard] = React.useState<DashboardData | null>(null)
	const [creditScore, setCreditScore] = React.useState<CreditScore | null>(null)


	// loading and getting the dashboard 
	React.useEffect(() => {
		async function loadDashboard() {
			try {
				const response = await getDashboard()
				console.log("getDashboard response: ", response)
				setDashboard(response.data)
				const creditScoreResponse = await getCrditScore()
				console.log("getCrditScore response: ", creditScoreResponse)
				setCreditScore(creditScoreResponse.data)

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
	const gamificationProfile = dashboard?.gamificationProfile
	const upcomingPayments = dashboard?.upcomingPayments ?? []
	console.log('Upcoming payments:', upcomingPayments );

	const name = userSummary?.displayName

	const score_ = creditScore?.creditScore ?? 0 // current credit score 
	const level_ = gamificationProfile?.mascotLevel ?? 1
	const knowledgeStreak=gamificationProfile?.currentKnowledgeStreak??0

	const xp = {
		current: gamificationProfile?.xp ?? 0,
		next: 1200,
		nextLevel: (gamificationProfile?.mascotLevel ?? 1) + 1,
	}

	async function handleSignOut() {
		try {
			await signOut()
			clearUnreadCount()
			navigate("/login")
		} catch (error) {
			console.error("Failed to sign out:", error)
		}
	}

	return (
		<div className="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
			<div className="mx-auto w-full max-w-md px-5 pt-6">

				<header className="flex items-start justify-between gap-3">
					<div>
						<h1 className="text-3xl font-extrabold leading-tight text-[#091828] dark:text-white">
							Hey<br />{name}
						</h1>
					</div>

					<div className="flex items-center gap-2">
						<NotificationBell/>
						<button
							type="button"
							aria-label="Sign out"
							onClick={handleSignOut}
							className="flex size-10 items-center justify-center rounded-full bg-[#FFD9E1] text-[#AC2A5D] transition hover:bg-[#FFB3C6] active:translate-y-px dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d] dark:hover:bg-[#ff6b9d]/30"
						>
							<LogOut className="size-5" />
						</button>
					</div>
				</header>

            <CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm dark:bg-[#131b2e] dark:shadow-lg dark:shadow-black/20">

				<div className="flex justify-center">
					<CreditScoreGauge score={score_} max={850} size="lg" />
				</div>

				<div className="mt-3 flex flex-col items-center gap-2">
					<CustomCard
						className="flex w-full max-w-[280px] flex-col items-center rounded-2xl bg-[#FFF4F7] p-4 dark:bg-[#1c263c]"
						data-testid="knowledge-streak"
					>
						<p className="text-xs font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#ff6b9d]">Knowledge streak</p>
						<StreakFlame
							days={knowledgeStreak}
							label="days"
							size="sm"
						/>
						<StreakTicks
							total={7}
							completed={Array.from(
								{length:Math.min(knowledgeStreak,7)},
								(_,index)=>index,
							)}
							size="sm"
							aria-label={`${knowledgeStreak} day knowledge streak`}
						/>
					</CustomCard>
					<div className="flex items-center justify-center gap-2">
						<CustomBadge variant="level" size="md" className="dark:border dark:border-solid dark:border-white/10 dark:bg-black">
							Lvl {level_}
						</CustomBadge>
						<Sticker tone="yellow" shape="squircle" size="sm" tilt="right" className="dark:bg-[#ffd166] dark:text-black">
							<span className="px-2 text-[10px] font-bold tracking-wide text-[#091828] dark:text-black">
								Early Bird
							</span>
						</Sticker>
					</div>
				</div>

            </CustomCard>

			<CreditStatsSection creditScore={creditScore}/>


				<section aria-label="Experience progress" className="mt-5" >

					<div className="flex items-center justify-between text-xs font-semibold text-[#091828] dark:text-white">
						<span>{xp.current.toLocaleString()} / {xp.next.toLocaleString()} XP</span>
						<span className="text-[#6b6375] dark:text-[#a0aec0]">Next Level: {xp.nextLevel}</span>
					</div>

					<Progress
						value={(xp.current / xp.next) * 100 }
						className="mt-2 h-2.5"
						aria-label={`${xp.current} of ${xp.next} XP earned`}
					/>

					<div className="mt-4 flex items-center justify-between gap-3">
						<XpPill amount={xp.current} className="shrink-0 dark:border-black dark:bg-[#ffd166] dark:text-black dark:shadow-[2px_3px_0_#000]" />
						<span className="text-xs font-medium text-[#6b6375] dark:text-[#a0aec0]">
							Next reward unlocked soon
						</span>
					</div>

				</section>

				<UpcomingPaymentsCard upcomingPayments={upcomingPayments} />




            <Link to = "/insights" className="mt-6 block">
                <CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3 dark:border-white/5 dark:bg-[#131b2e]">
                    <CategoryIcon tone="pink">
                        <TrendingUp className="size-5"/>
                    </CategoryIcon>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#091828] dark:text-white">Insights</p>
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-[#6b6375] dark:text-[#a0aec0]"/>
                </CustomCard>
            </Link>


			{/*friends hub card*/}

			<CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm dark:bg-[#131b2e] dark:shadow-lg dark:shadow-black/20">
 
				<SectionHeader title="Friends" meta="See what friends are up to" />

				<div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
					<CategoryIcon tone="mint">
						<User className="size-5" />
					</CategoryIcon>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-bold text-[#091828] dark:text-white">Friends Hub</p>
						{/*TO DO: avatar row and online count when friends endpoint exists */}
						<p className="text-xs text-[#6b6375] dark:text-[#a0aec0]">Connect, compete and celebrate together.</p>
					</div>
				</div>

				<LongButton
					LongVariant="primaryMint"
					LongSize="md"
					className="mt-4 dark:bg-[#5eead4] dark:text-[#134e4a] dark:hover:bg-[#2dd4bf]"
					showArrow={false}
					asChild
				>
					<Link to="/friends">View Friends</Link>
				</LongButton>
			</CustomCard>
 

			{/*sticker album card*/}

				<CustomCard className="mt-6 rounded-3xl bg-white p-5 shadow-sm dark:bg-[#131b2e] dark:shadow-lg dark:shadow-black/20">

					<SectionHeader title="Stickers" meta="24 collected · 32 to go" />

					<div className="mt-4 grid grid-cols-4 justify-items-center gap-3">
						<Sticker tone="pink" shape="circle" size="lg" tilt="left" className="dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]">
							<HugeiconsIcon icon={SparklesIcon} size={44} color="currentColor" strokeWidth={1.5} />
						</Sticker>
						<Sticker tone="yellow" shape="circle" size="lg" tilt="right" className="dark:bg-[#ffd166]/20 dark:text-[#ffd166]">
							<HugeiconsIcon icon={FireIcon} size={44} color="currentColor" strokeWidth={1.5} />
						</Sticker>
						<Sticker tone="mint" shape="circle" size="lg" tilt="left" className="dark:bg-[#5eead4]/20 dark:text-[#5eead4]">
							<HugeiconsIcon icon={SunriseIcon} size={44} color="currentColor" strokeWidth={1.5} />
						</Sticker>
						<Sticker tone="slate" shape="circle" size="lg" state="locked" className="dark:border-[#a0aec0]/50 dark:text-[#a0aec0]" />
					</div>

					<LongButton
						LongVariant="primaryYellow"
						LongSize="md"
						className="mt-4 dark:bg-[#ffd166] dark:text-black dark:hover:bg-[#e6bd5c]"
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
			<h2 className="text-lg font-extrabold text-[#091828] dark:text-white">{title}</h2>
			{meta && (
				<span className="text-xs font-medium text-[#6b6375] dark:text-[#a0aec0]">{meta}</span>
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
		mint: "bg-[#DCEFE8] text-[#091828] dark:bg-[#131b2e] dark:text-[#a0aec0]",
		lilac: "bg-[#E8E4F4] text-[#5b4d8b] dark:bg-[#131b2e] dark:text-[#a0aec0]",
		pink: "bg-[#FFD8E6] text-[#ac2a5d] dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]",
		yellow: "bg-[#FFE9B5] text-[#7a5a00] dark:bg-[#ffd166]/20 dark:text-[#ffd166]",
		navy: "bg-[#0a1929] text-white dark:bg-[#1c263c]",
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