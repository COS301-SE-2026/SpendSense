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
	useEffect(() =>{
		const controller=new AbortController()
		load(controller.signal)
		return() =>{
			controller.abort()
		}
	}, [load])
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
				<header>
					<h1 className="text-3xl font-extrabold leading-tight text-[#091828]">Quests</h1>
					<p className="mt-1 text-sm text-[#6b6375]">Complete quests. Earn rewards.</p>
				</header>
				{pageError &&(
					<div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFD9E1] px-4 py-3">
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
				{/* Today */}
				<Section title="" className="mt-6">
					{isLoading?(
						<QuestCardSkeleton/>
					):(
						<QuestCard
							icon={<CalendarCheck className="size-5"/>}
							tone="pink"
							title="Daily Quiz"
							description={dailyContent.description}
							xp={dailyContent.xp}
							knowledgeStreak={knowledgeStreak}
							actionLabel={dailyContent.actionLabel}
							disabled={dailyContent.disabled}
							onAction={()=>navigate("/quiz")}
						/>
					)}
				</Section>
				{/* This Month */}
				<Section title="" className="mt-6">
					{isLoading?(
						<TopicCardSkeleton/>
					):(
						<button
							type="button"
							onClick={()=>navigate("/quiz/topics")}
							className="w-full text-left"
						>
							<CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
								<QuestIcon tone="lilac"><Mountain className="size-5"/></QuestIcon>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-bold text-[#091828]">Financial Topic Quizes</p>
									<p className="text-xs text-[#6b6375]">Complete Topic quizes to become finacially free!</p>
									<Progress
										value={topicsProgress}
										className="mt-2 h-1.5"
										aria-label={`${availableTopics} of ${totalTopics} topics unlocked`}
									/>
									<p className="mt-1 text-[11px] font-semibold text-[#6b6375]">
										{availableTopics} of{totalTopics} topics unlocked
									</p>
								</div>
								<ChevronRight className="size-4 shrink-0 text-[#6b6375]"/>
							</CustomCard>
						</button>
					)}
					<CustomCard variant="navyBorder" size="sm" className="mt-3 flex items-center gap-3">
						<QuestIcon tone="yellow"><Gift className="size-5"/></QuestIcon>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-bold text-[#091828]">Rewards</p>
							<p className="text-xs text-[#6b6375]">Redeem your coins and claim exclusive perks.</p>
						</div>
						<ChevronRight className="size-4 shrink-0 text-[#6b6375]"/>
					</CustomCard>
				</Section>
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

function Section({
	title,
	children,
	className,
}:Readonly<{
	title:string
	children:React.ReactNode
	className?:string
}>){
	return(
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
	knowledgeStreak,
    onAction,
    asLink,
    to,
    disabled,
}:Readonly<{
    icon:React.ReactNode
    tone:"pink"|"mint"|"yellow"|"lilac"
    title:string
    description:string
    xp:number
    actionLabel:string
	knowledgeStreak:number|null
    onAction?:()=>void
    asLink?:boolean
    to?:string
    disabled?:boolean
}>){
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
			{knowledgeStreak!==null&&(
				<div
					className="mt-4 rounded-2xl border border-[#FFD8E6] bg-[#FFF7F9] px-4 py-3"
					data-testid="knowledge-streak"
				>
					<div className="grid grid-cols-[72px_1fr] items-center gap-4">
						<div className="flex justify-center">
							<StreakFlame
								days={knowledgeStreak}
								label="days"
								size="sm"
							/>
						</div>
						<div className="min-w-0 text-center">
							<div>
								<p className="text-[11px] font-bold uppercase tracking-wide text-[#AC2A5D]">Knowledge streak</p>
								<p className="mt-0.5 text-xs text-[#6b6375]">Keep learning every day</p>
							</div>
							<div className="mt-3 flex justify-center overflow-hidden">
								<StreakTicks
									total={7}
									completed={Array.from(
										{length:Math.min(knowledgeStreak,7)},
										(_,index)=>index,
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
				asChild={asLink}
				disabled={disabled}
				onClick={asLink?undefined:onAction}
			>
				{asLink&&to?<Link to={to}>{actionLabel}</Link>:actionLabel}
			</LongButton>
		</CustomCard>
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