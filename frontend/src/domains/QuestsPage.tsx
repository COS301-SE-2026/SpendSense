import*as React from "react"
import{ Link, useNavigate } from "react-router-dom"
import{
	CalendarCheck,
	Mountain,
	Gift,
	ChevronRight,
	Home,
	Calendar as CalendarIcon,
	Trophy,
	User,
	AlertTriangle,
	Coins,
} from "lucide-react"
import{ useCallback, useEffect, useState } from "react"
import{ CustomCard } from "@/components/ui/CustomCard"
import{ Progress } from "@/components/ui/progress"
import{ LongButton } from "@/components/common/LongButton"
import{ CustomBadge } from "@/components/common/CustomBadges"
import{ AddTransactionButton } from "@/components/common/AddTransactionButton"
import{ StreakFlame } from "@/components/common/StreakFlame"
import{ StreakTicks } from "@/components/common/StreakTicks"
import { useGamificationProfile } from "@/hooks/useGamificationProfile"
import{ cn } from "@/lib/utils"
import{ getDailyQuiz, getQuizTopics } from "@/features/quiz/quizApi"
import type{ DailyQuizState, QuizTopicSummary } from "@/features/quiz/quizTypes"

function isAbortError(error:unknown){
	return error instanceof Error && error.name==="AbortError"
}

function useQuestsOverview(){
	const [daily, setDaily]=useState<DailyQuizState|null>(null)
	const [topics, setTopics]=useState<QuizTopicSummary[]|null>(null)
	const [loading, setLoading]=useState(true)
	const [error, setError]=useState<string|null>(null)
	const load=useCallback(async(signal?:AbortSignal) =>{
		setLoading(true)
		setError(null)
		try{
			const [dailyRes, topicsRes]=await Promise.all([
				getDailyQuiz({ signal }),
				getQuizTopics({ signal }),
			])
			setDaily(dailyRes)
			setTopics(topicsRes)
		} catch(err){
			if(isAbortError(err)){
				return
			}
			setError(err instanceof Error?err.message:"Failed to load quests.")
		} finally{
			if(!signal?.aborted){
				setLoading(false)
			}
		}
	}, [])
	useEffect(()=>{
		const controller=new AbortController()
		void Promise.resolve().then(()=>{
			load(controller.signal)
		})
		return()=>{
			controller.abort()
		}
	},[load])
	return{ daily, topics, loading, error, reload:()=>load() }
}

export default function QuestsPage(){
	const navigate=useNavigate()
	const{ daily, topics, loading, error, reload }=useQuestsOverview()
	const{
		profile:gamificationProfile,
		loading:gamificationLoading,
		error:gamificationError,
		refetch:refetchGamification,
	}=useGamificationProfile()
	const dailyContent=getDailyQuestContent(daily)
	const knowledgeStreak=gamificationProfile?.knowledgeStreak??0
	const isLoading=loading||gamificationLoading
	const pageError=error??gamificationError
	const availableTopics=topics?.filter((t)=>t.available).length??0
	const totalTopics=topics?.length??0
	const topicsProgress=totalTopics>0?(availableTopics/totalTopics)*100:0
	return(
		<div className="min-h-screen bg-[#F4FBF7] pb-24">
			<div className="mx-auto w-full max-w-md px-5 pt-6">
				<header className="flex items-center gap-3">
					<div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828]">
						<Trophy className="size-5 text-[#6E0034]"/>
					</div>
					<div className="flex flex-1 items-center justify-center">
						<div className="rounded-full border-2 border-[#091828] bg-white px-8 py-2.5 shadow-[4px_4px_0_#091828]" style={{transform:"rotate(-3deg)"}}>
							<h1 className="text-base font-bold text-[#091828]">Quests</h1>
						</div>
					</div>
					<div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFE9B5] shadow-[4px_4px_0_#091828]">
						<Coins className="size-5 text-[#7A5A00]"/>
					</div>
				</header>
				<div className="mt-8 rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-5 py-5 shadow-[4px_4px_0_#091828]">
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#AC2A5D]">Your learning path</p>
					<h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#091828]">Choose your next quest.</h2>
					<p className="mt-1 text-sm leading-relaxed text-[#6b6375]">Build your money knowledge and collect rewards as you go.</p>
				</div>
				{error &&(
					<div className="mt-6 flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFF1F4] px-4 py-3">
						<AlertTriangle className="size-4 shrink-0 text-[#AC2A5D]"/>
						<p className="flex-1 text-sm font-semibold text-[#AC2A5D]">{pageError}</p>
						<button
							type="button"
							onClick={()=>{
								reload()
								refetchGamification()
							}}
							className="shrink-0 text-sm font-bold text-[#AC2A5D] underline"
						>
							Retry
						</button>
					</div>
				)}
				<section className="mt-7">
					<div className="mb-3 flex items-end justify-between">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b6375]">Start here</p>
							<h2 className="mt-1 text-xl font-extrabold text-[#091828]">Quiz quests</h2>
						</div>
						<p className="text-xs font-semibold text-[#6b6375]">Earn XP as you learn</p>
					</div>
					{loading?(
						<QuestCardSkeleton/>
					):(
						<QuizQuestCard
							icon={<CalendarCheck className="size-5"/>}
							tone="pink"
							title="Daily Quiz"
							eyebrow="Today's challenge"
							description={dailyContent.description}
							xp={dailyContent.xp}
							knowledgeStreak={knowledgeStreak}
							actionLabel={dailyContent.actionLabel}
							disabled={dailyContent.disabled}
							onAction={()=>navigate("/quiz")}
						/>
					)}
				</section>
				<section className="mt-5">
					{isLoading?(
						<TopicCardSkeleton/>
					):(
						<QuizQuestCard
							icon={<Mountain className="size-5"/>}
							tone="lilac"
							title="Financial Topic Quizes"
							eyebrow="Choose your subject"
							description="Explore focused lessons and take a quiz when you're ready."
							progress={topicsProgress}
							progressLabel={`${availableTopics} of ${totalTopics} topics unlocked`}
							actionLabel="Explore topics"
							actionAriaLabel="Financial Topic Quizes"
							onAction={()=>navigate("/quiz/topics")}
						/>
					)}
				</section>
				<button type="button" className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#B8CBBF] bg-white/70 px-4 py-3 text-left">
					<QuestIcon tone="yellow"><Gift className="size-5"/></QuestIcon>
					<span className="min-w-0 flex-1">
						<span className="block text-sm font-bold text-[#091828]">Rewards</span>
						<span className="block text-xs text-[#6b6375]">Redeem your coins and claim exclusive perks.</span>
					</span>
					<ChevronRight className="size-4 shrink-0 text-[#6b6375]"/>
				</button>
			</div>
			<BottomNav active="quests"/>
		</div>
	)
}

function getDailyQuestContent(daily:DailyQuizState|null):{
	description:string
    xp:number
	actionLabel:string
	disabled:boolean
}{
	if(!daily){
		return{
			description:"Complete your Daily quiz to build your streak!",
			xp:0,
			actionLabel:"Check in",
			disabled:true,
		}
	}
	if(daily.status==="COMPLETED"){
		return{
			description:"You've completed today's quiz. Come back tomorrow!",
			xp:daily.reward.xp,
			actionLabel:"Completed",
			disabled:true,
		}
	}
	if(daily.status==="IN_PROGRESS"){
		return{
			description:`In progress - ${daily.session.progress.answeredAttempts} of ${daily.session.progress.initialQuestions} answered so far.`,
			xp:daily.rewardPreview.xp,
			actionLabel:"Resume",
			disabled:false,
		}
	}
	return{
		description:"Complete your Daily quiz to build your streak!",
		xp:daily.rewardPreview.xp,
		actionLabel:"Check in",
		disabled:false,
	}
}

function QuizQuestCard({
    icon,
    tone,
    title,
	eyebrow,
    description,
	xp,
	badgeLabel,
	progress,
	progressLabel,
	actionAriaLabel,
    actionLabel,
	knowledgeStreak,
    onAction,
    asLink,
    to,
    disabled,
}:Readonly<{
    icon:React.ReactNode
    tone:"pink"|"mint"|"yellow"|"lilac"
    title:string
	eyebrow:string
    description:string
	xp?:number
	badgeLabel?:string
	progress?:number
	progressLabel?:string
	actionAriaLabel?:string
    actionLabel:string
	knowledgeStreak:number|null
    onAction?:()=>void
    asLink?:boolean
    to?:string
    disabled?:boolean
}>){return (
	<CustomCard variant="navyShaddow" size="md" className="border-2 border-[#091828]">
		<div className="flex items-start gap-3">
			<QuestIcon tone={tone}>{icon}</QuestIcon>

			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b6375]">
							{eyebrow}
						</p>
						<p className="mt-1 text-lg font-extrabold leading-tight text-[#091828]">
							{title}
						</p>
					</div>

					{(badgeLabel || (xp ?? 0) > 0) && (
						<CustomBadge variant="xp" size="sm">
							{badgeLabel ?? `+${xp} XP`}
						</CustomBadge>
					)}
				</div>

				<p className="mt-2 text-sm leading-relaxed text-[#6b6375]">
					{description}
				</p>

				{progress !== undefined && (
					<div className="mt-4">
						<Progress value={progress} className="h-2" aria-label={progressLabel} />
						<p className="mt-1 text-[11px] font-semibold text-[#6b6375]">
							{progressLabel}
						</p>
					</div>
				)}
			</div>
		</div>

		{knowledgeStreak !== undefined && (
			<div
				className="mt-4 rounded-2xl border border-[#FFD8E6] bg-[#FFF7F9] px-4 py-3"
				data-testid="knowledge-streak"
			>
				<div className="grid grid-cols-[72px_1fr] items-center gap-4">
					<div className="flex justify-center">
						<StreakFlame days={knowledgeStreak} label="days" size="sm" />
					</div>

					<div className="min-w-0 text-center">
						<p className="text-[11px] font-bold uppercase tracking-wide text-[#AC2A5D]">
							Knowledge streak
						</p>
						<p className="mt-0.5 text-xs text-[#6b6375]">
							Keep learning every day
						</p>

						<div className="mt-3 flex justify-center overflow-hidden">
							<StreakTicks
								total={7}
								completed={Array.from(
									{ length: Math.min(knowledgeStreak, 7) },
									(_, index) => index,
								)}
								size="sm"
								aria-label={`${knowledgeStreak} day knowledge streak`}
							/>
						</div>
					</div>
				</div>
			</div>
		)}

		<LongButton
			LongVariant="primaryDark"
			LongSize="sm"
			className="mt-3"
			showArrow={false}
			aria-label={actionAriaLabel}
			asChild={asLink}
			disabled={disabled}
			onClick={asLink ? undefined : onAction}
		>
			{asLink && to ? <Link to={to}>{actionLabel}</Link> : actionLabel}
		</LongButton>
	</CustomCard>
)
	)
}

function QuestCardSkeleton(){
	return(
		<CustomCard variant="greenShaddow" size="sm">
			<div className="flex items-start gap-3">
				<div className="size-10 shrink-0 animate-pulse rounded-full bg-[#DCEFE8]"/>
				<div className="min-w-0 flex-1 space-y-2">
					<div className="h-4 w-1/2 animate-pulse rounded bg-[#DCEFE8]"/>
					<div className="h-3 w-4/5 animate-pulse rounded bg-[#DCEFE8]"/>
				</div>
			</div>
			<div className="mt-3 h-9 w-full animate-pulse rounded-full bg-[#DCEFE8]"/>
		</CustomCard>
	)
}

function TopicCardSkeleton(){
	return(
		<CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
			<div className="size-10 shrink-0 animate-pulse rounded-full bg-[#E8E4F4]"/>
			<div className="min-w-0 flex-1 space-y-2">
				<div className="h-4 w-2/3 animate-pulse rounded bg-[#E8E4F4]"/>
				<div className="h-3 w-4/5 animate-pulse rounded bg-[#E8E4F4]"/>
				<div className="h-1.5 w-full animate-pulse rounded bg-[#E8E4F4]"/>
			</div>
		</CustomCard>
	)
}

function QuestIcon({
    tone,
    children,
}:Readonly<{
    tone:"mint"|"lilac"|"pink"|"yellow"
    children:React.ReactNode
}>){
    const toneClass:Record<typeof tone, string> ={
        pink:"bg-[#FFD8E6] text-[#ac2a5d]",
        mint:"bg-[#DCEFE8] text-[#091828]",
        yellow:"bg-[#FFE9B5] text-[#7a5a00]",
        lilac:"bg-[#E8E4F4] text-[#5b4d8b]",
    }
    return(
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneClass[tone]}`}>
			{children}
		</div>
	)
}

type BottomNavTab="home"|"calendar"|"quests"|"profile"

function BottomNav({ active }:{ active:BottomNavTab }){
    return(
        <nav
            aria-label="Primary"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E4F4] bg-white/95 backdrop-blur"
        >
            <div className="mx-auto flex w-full max-w-md items-center justify-around px-4 py-2">
                <BottomNavItem to="/" icon={<Home className="size-5"/>} label="Home" active={active==="home"}/>
                <BottomNavItem to="/calendar" icon={<CalendarIcon className="size-5"/>} label="Calendar" active={active==="calendar"}/>
                <AddTransactionButton/>
                <BottomNavItem to="/quests" icon={<Trophy className="size-5"/>} label="Quests" active={active==="quests"}/>
                <BottomNavItem to="/profile" icon={<User className="size-5"/>} label="Profile" active={active==="profile"} disabled={false}/>
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
}:Readonly<{
    to:string
    icon:React.ReactNode
    label:string
    active:boolean
    disabled?:boolean
}>){
    return(
        <Link
            to={to}
            aria-disabled={disabled}
            onClick={(e) =>{
                if(disabled){
                    e.preventDefault();
                }
            }}
            className={cn(
                "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                active
                   ?"bg-[#FFD8E6] text-[#ac2a5d]"
                   :"text-[#6b6375] hover:text-[#091828]",
                disabled && "opacity-35 pointer-events-none cursor-not-allowed select-none"
            )}
            aria-current={active?"page":undefined}
        >
           {icon}
            <span>{label}</span>
        </Link>
    )
}
