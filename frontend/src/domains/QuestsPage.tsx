import * as React from "react"
import { Link } from "react-router-dom"
import {
	CalendarCheck,
	Sparkles,
	Mountain,
	LifeBuoy,
	Gift,
	ChevronRight,
	Home,
	Calendar as CalendarIcon,
	Trophy,
	User,
} from "lucide-react"
 

import { CustomCard } from "@/components/ui/CustomCard"
import { Progress } from "@/components/ui/progress"
import { LongButton } from "@/components/common/LongButton"
import { CustomBadge } from "@/components/common/CustomBadges"
import { AddTransactionButton } from "@/components/common/AddTransactionButton"
import { cn } from "@/lib/utils"

export default function QuestsPage() {
    return(
        <div className="min-h-screen bg-[#F4FBF7] pb-24">
			<div className="mx-auto w-full max-w-md px-5 pt-6">
 
				<header>
					<h1 className="text-3xl font-extrabold leading-tight text-[#091828]">Quests</h1>
					<p className="mt-1 text-sm text-[#6b6375]">Complete quests. Earn rewards.</p>
				</header>

                {/* Today */}
				<Section title="Today" className="mt-6">
					<QuestCard
						icon={<CalendarCheck className="size-5" />}
						tone="pink"
						title="Daily Check-In"
						description="Check in daily and build your streak!"
						xp={10}
						actionLabel="Check in"
						onAction={() => {
							//TO DO: connect to check-in/insights endpoint once it exists
						}}
					/>

                    <QuestCard
						icon={<Sparkles className="size-5" />}
						tone="mint"
						title="Financial Quiz"
						description="Test your money smarts and earn coins!"
						xp={20}
						actionLabel="Start Quiz"
						asLink
						to="/quiz"
					/>
				</Section>

                {/* This Month */}
				<Section title="This Month" className="mt-6">
					<CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
						<QuestIcon tone="lilac"><Mountain className="size-5" /></QuestIcon>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-bold text-[#091828]">Monthly Challenges</p>
							<p className="text-xs text-[#6b6375]">Complete challenges to earn big rewards!</p>
							<Progress value={50} className="mt-2 h-1.5" aria-label="2 of 4 challenges complete" />
						</div>
						<ChevronRight className="size-4 shrink-0 text-[#6b6375]" />
					</CustomCard>
 
					<CustomCard variant="navyBorder" size="sm" className="mt-3 flex items-center gap-3">
						<QuestIcon tone="pink"><LifeBuoy className="size-5" /></QuestIcon>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<p className="text-sm font-bold text-[#091828]">Recovery Mode</p>
								<CustomBadge variant="tier" size="sm">New</CustomBadge>
							</div>
							<p className="text-xs text-[#6b6375]">Get back on track and earn recovery rewards.</p>
						</div>
						<ChevronRight className="size-4 shrink-0 text-[#6b6375]" />
					</CustomCard>
 
					<CustomCard variant="navyBorder" size="sm" className="mt-3 flex items-center gap-3">
						<QuestIcon tone="yellow"><Gift className="size-5" /></QuestIcon>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-bold text-[#091828]">Rewards</p>
							<p className="text-xs text-[#6b6375]">Redeem your coins and claim exclusive perks.</p>
						</div>
						<ChevronRight className="size-4 shrink-0 text-[#6b6375]" />
					</CustomCard>
				</Section>
 
			</div>
 
			<BottomNav active="quests" />
		</div>
	)
}

function Section({
	title,
	children,
	className,
}: Readonly<{
	title: string
	children: React.ReactNode
	className?: string
}>) {
	return (
		<section className={className}>
			<h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#6b6375]">{title}</h2>
			<div className="flex flex-col gap-3">{children}</div>
		</section>
	)
}

function QuestCard({
    icon,
    tone,
    title,
    description,
    xp,
    actionLabel,
    onAction,
    asLink,
    to,
}: Readonly<{
    icon: React.ReactNode
    tone: "pink" | "mint" | "yellow" | "lilac"
    title: string
    description: string
    xp: number
    actionLabel: string
    onAction?: () => void
    asLink?: boolean
    to?: string
}>) {

    //shadow is misspelled as "greenShaddow" in CustomCard.tsx.
    return(

        <CustomCard variant="greenShaddow" size="sm"> 
                    <div className="flex items-start gap-3">
                        <QuestIcon tone={tone}>{icon}</QuestIcon>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-[#091828]">{title}</p>
                                <CustomBadge variant="xp" size="sm">+{xp} XP</CustomBadge>
                            </div>
                            <p className="mt-0.5 text-xs text-[#6b6375]">{description}</p>
                        </div>
                    </div>
        
                    <LongButton
                        LongVariant="primaryDark"
                        LongSize="sm"
                        className="mt-3"
                        showArrow={false}
                        asChild={asLink}
                        onClick={asLink ? undefined : onAction}
                    >
                        {asLink && to ? <Link to={to}>{actionLabel}</Link> : actionLabel}
                    </LongButton>
                </CustomCard>
    )
}
    
function QuestIcon({
    tone,
    children,
}: Readonly<{
    tone: "mint" | "lilac" | "pink" | "yellow"
    children: React.ReactNode
}>) {
    const toneClass: Record<typeof tone, string> = {
        pink: "bg-[#FFD8E6] text-[#ac2a5d]",
        mint: "bg-[#DCEFE8] text-[#091828]",
        yellow: "bg-[#FFE9B5] text-[#7a5a00]",
        lilac: "bg-[#E8E4F4] text-[#5b4d8b]",
    }
    return (
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneClass[tone]}`}>
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

                {/* floating + action */}
                <AddTransactionButton />

                <BottomNavItem to="/quests" icon={<Trophy className="size-5" />} label="Quests" active={active === "quests"} />
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
