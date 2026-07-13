import * as React from "react"
import { Link } from "react-router-dom"
import {
	Users,
	UserPlus,
	Trophy,
	//Swords,
	Activity,
	ChevronRight,
	Home,
	Calendar as CalendarIcon,
	User,
	//Search,
} from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
//import {LongButton} from "@/components/common/LongButton"
//import { CustomBadge } from "@/components/common/CustomBadges"
import { AddTransactionButton } from "@/components/common/AddTransactionButton"
import { cn } from "@/lib/utils"


type HubTab="feed" |"friends"|"leaderboard"

export default function FriendsPage() {
    const[tab, setTab] = React.useState<HubTab>("friends")

	return(
		<div className="min-h-screen bg-[#F4FB7] pb-24">
			<div className="mx-auto w-full max-w-md px-5 pt-6">
				<header className ="flex items-start justify-between gap-3">
					<div>
						<h1 className = "text-3xl font-extrabold leading-tight text-[#091828]">Friends Hub</h1>
						<p className ="mt-1 text-sm text-[#6b375]">Connect, compete and celebrate together.</p>
					</div>
					<Link 
						to="/friends/add"
						aria-label="Add Friend"
						className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFD9E1] text-[#AC2A5D] transition hover:bg-[#FFB3C6] active:translate-y-px">
							<UserPlus className="size-5" />
						</Link>

				</header>

				<HubTabs active={tab} onChange={setTab} />

				<div className = "mt-6 flex flex-col gap-3">
					{tab==="feed" && (
						/*TO DO: activity feed rows*/
						<HubLinkCard
							to="/friends/activity"
							tone="lilac"
							icon={<Activity className="size-5" />}
							title="Activity Feed"
							description="See what your friends are up to."
						/>	

					)}

					{tab==="friends" && (
						/*TO DO: friends things*/

						<HubLinkCard
							to="/friends/list"
							tone="mint"
							icon={<Users className="size-5" />}
							title="Friends (0)"
							description="View all friends and requests."
						/>
					)}

					{tab === "leaderboard" && (
						/*TO DO: leaderboard, challenges etc*/
						<HubLinkCard
							to="/friends/leaderboard"
							tone="yellow"
							icon={<Trophy className="size-5" />}
							title="Leaderboard"
							description="See how you rank against your friends."
						/>
					)}


				</div>

			</div>

			<BottomNav active="friends" />
		</div>
	)
}

function HubTabs({
	active,
	onChange,
}: Readonly<{
	active: HubTab
	onChange: (tab: HubTab) => void
}>) {
	const tabs: {key: HubTab; label: string}[] = [
		{key: "feed", label: "Feed"},
		{key: "friends", label: "Friends"},
		{key: "leaderboard", label: "Leaderboard"},
	]

	return(
		<div className="mt-5 flex items-center gap-2 rounded-full bg-[#E3EAE6] p-1">
			{tabs.map((t) => (
				<button
					key={t.key}
					type="button"
					onClick={() => onChange(t.key)}
					className={cn(
						"flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
						active ===t.key
							? "bg-[#FFD8E6] text-[#AC2A5D]"
							: "text-[#6B6375] hover:text-[#091828]"
					)}
					aria-pressed={active === t.key}
				>
					{t.label}
				</button>
			))}
		</div>
	)
}

function HubLinkCard({
	to,
	tone,
	icon,
	title,
	description,
}: Readonly<{
	to: string
	tone: "mint" | "lilac" | "pink" | "yellow"
	icon: React.ReactNode
	title: string
	description: string
}>) {
	const toneClasses: Record<typeof tone, string> = {
		pink: "bg-[#FFD8E6] text-[#ac2a5d]",
		mint: "bg-[#DCEFE8] text-[#091828]",
		yellow: "bg-[#FFE9B5] text-[#7a5a00]",
		lilac: "bg-[#E8E4F4] text-[#5b4d8b]",
	}

	return(
		<Link to={to}>
			<CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
				<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}>
					{icon}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-bold text-[#091828]">{title}</p>
					<p className="text-xs text-[#6B6375]">{description}</p>
				</div>

				<ChevronRight className="size-4 shrink-0 text-[#6B6375]" />
			</CustomCard>
		</Link>
	)
}

type BottomNavTab = "home" | "calendar" | "quests" | "profile" | "friends"
 
function BottomNav({ active }: Readonly<{ active: BottomNavTab }>) {
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
 
				<BottomNavItem to="/quests" icon={<Trophy className="size-5" />} label="Quests" active={active === "quests"} />
				<BottomNavItem to="/profile" icon={<User className="size-5" />} label="Profile" active={active === "profile"} />
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
}: Readonly<{
	to: string
	icon: React.ReactNode
	label: string
	active: boolean
	disabled?: boolean
}>) {
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