import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
	LogOut,
	BookOpen,
	CalendarCheck,
} from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { Progress } from "@/components/ui/progress"
import { Sticker } from "@/components/ui/sticker"

import { CreditScoreGauge } from "@/components/common/CreditScoreGauge"
import { CustomBadge } from "@/components/common/CustomBadges"
import { XpPill } from "@/components/common/XpPill"
import { NotificationBell } from "@/components/notifications/NotificationBell"


import { UpcomingPaymentsCard } from "@/components/dashboard/UpcomingPaymentsCard"
import { CreditStatsSection } from "@/components/dashboard/CreditStats"
import { getDashboard } from "@/features/dashboard/dashboardApi"
import { signOut } from "@/features/auth/auth.service"
import { useNotifications } from "@/features/notifications/useNotifications"

import type { DashboardData } from "@/types/DashboardTypes"
import type { CreditScore } from "@/types/credit-scoreTypes"
import { getCrditScore } from "@/features/credit-score/credit-scoreApi"
import { StreakCarousel, type StreakPanel } from "@/components/dashboard/StreakCarousel"
import { BottomNav } from "@/components/common/BottomNav"
import { DashboardCarousel } from "@/components/dashboard/DashbordCarousel"

export default function DashboardPage() {
	const navigate = useNavigate()
	const { clearUnreadCount } = useNotifications()

	const [dashboard, setDashboard] = React.useState<DashboardData | null>(null)
	const [creditScore, setCreditScore] = React.useState<CreditScore | null>(null)


	// loading and getting the dashboard 
	React.useEffect(() => {
		async function loadDashboard() {
			try {
				const response = await getDashboard()
				setDashboard(response.data)
				const creditScoreResponse = await getCrditScore()
				setCreditScore(creditScoreResponse.data)

			} catch (error) {
				console.error("getDashboard response: ", error)
			}
		}
		loadDashboard()

		function test() {

		}
		test()
	}, [])


	const userSummary = dashboard?.userSummary
	const gamificationProfile = dashboard?.gamificationProfile
	const upcomingPayments = dashboard?.upcomingPayments ?? []

	const name = userSummary?.displayName

	const score_ = creditScore?.creditScore ?? 0 // current credit score 
	const level_ = gamificationProfile?.mascotLevel ?? 1
	const knowledgeStreak = gamificationProfile?.currentKnowledgeStreak ?? 0
	const paymentStreak = gamificationProfile?.currentPaymentStreak ?? 0

	const streakPanels: StreakPanel[] = [
		{
			key: "knowledge",
			title: "Knowledge streak",
			days: knowledgeStreak,
			best: gamificationProfile?.longestKnowledgeStreak ?? 0,
			icon: BookOpen,
		},
		{
			key: "payment",
			title: "On-time payments",
			days: paymentStreak,
			best: gamificationProfile?.longestPaymentStreak ?? 0,
			icon: CalendarCheck,
		},
	]

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

	const stickersCollected = dashboard?.stickerStats?.collected
	const stickersTotal = dashboard?.stickerStats?.total

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
						<NotificationBell />
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
						<StreakCarousel panels={streakPanels} />
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

				<DashboardCarousel
					stickersCollected={stickersCollected}
					stickersTotal={stickersTotal}
				/>

				<CreditStatsSection creditScore={creditScore} />


				<section aria-label="Experience progress" className="mt-5" >

					<div className="flex items-center justify-between text-xs font-semibold text-[#091828] dark:text-white">
						<span>{xp.current.toLocaleString()} / {xp.next.toLocaleString()} XP</span>
						<span className="text-[#6b6375] dark:text-[#a0aec0]">Next Level: {xp.nextLevel}</span>
					</div>

					<Progress
						value={(xp.current / xp.next) * 100}
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
			</div>
			<BottomNav active="home" />
		</div>
	)
}
