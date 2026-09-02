import*as React from "react"
import{ Link, useNavigate } from "react-router-dom"
import{
	CalendarCheck,
	ChevronLeft,
	Mountain,
	AlertTriangle,
	Coins,
} from "lucide-react"
import{ useCallback, useEffect, useState } from "react"
import{ CustomCard } from "@/components/ui/CustomCard"
import{ Progress } from "@/components/ui/progress"
import{ LongButton } from "@/components/common/LongButton"
import{ CustomBadge } from "@/components/common/CustomBadges"
import{ BottomNav } from "@/components/common/BottomNav"
import{ StreakFlame } from "@/components/common/StreakFlame"
import{ StreakTicks } from "@/components/common/StreakTicks"
import { useGamificationProfile } from "@/hooks/useGamificationProfile"
import { useQuizSession } from "@/hooks/useQuizSession"
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
	const [isCoinBalanceOpen,setIsCoinBalanceOpen]=useState(false)
	const [isCoinBalanceFading,setIsCoinBalanceFading]=useState(false)
	const [isDailyQuizConfirmOpen,setIsDailyQuizConfirmOpen]=useState(false)
	const [dailyQuizConfirmMode,setDailyQuizConfirmMode]=useState<"START"|"RESUME">("START")
	const{ daily, topics, loading, error, reload }=useQuestsOverview()
	const{
		startDailyQuiz,
		isLoading:startingDailyQuiz,
		error:dailyQuizStartError,
		clearError:clearDailyQuizStartError,
	}=useQuizSession()
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
	useEffect(()=>{
		if(!isCoinBalanceOpen){
			return
		}
		const fadeTimer=window.setTimeout(()=>setIsCoinBalanceFading(true),700)
		const closeTimer=window.setTimeout(()=>{
			setIsCoinBalanceOpen(false)
			setIsCoinBalanceFading(false)
		},1100)
		return()=>{
			window.clearTimeout(fadeTimer)
			window.clearTimeout(closeTimer)
		}
	},[isCoinBalanceOpen])
	const handleCoinBalanceToggle=()=>{
		if(isCoinBalanceOpen){
			setIsCoinBalanceOpen(false)
			setIsCoinBalanceFading(false)
			return
		}
		setIsCoinBalanceFading(false)
		setIsCoinBalanceOpen(true)
	}
	const handleDailyQuizAction=()=>{
		if(daily?.status==="IN_PROGRESS"){
			clearDailyQuizStartError()
			setDailyQuizConfirmMode("RESUME")
			setIsDailyQuizConfirmOpen(true)
			return
		}
		clearDailyQuizStartError()
		setDailyQuizConfirmMode("START")
		setIsDailyQuizConfirmOpen(true)
	}
	const handleConfirmDailyQuiz=async()=>{
		if(dailyQuizConfirmMode==="RESUME"&&daily?.status==="IN_PROGRESS"){
			setIsDailyQuizConfirmOpen(false)
			navigate(`/quiz/session/${daily.session.id}`)
			return
		}
		const session=await startDailyQuiz()
		if(session){
			setIsDailyQuizConfirmOpen(false)
			navigate(`/quiz/session/${session.id}`)
		}
	}
	return(
		<div className="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
			<div className="mx-auto w-full max-w-md px-5 pt-6">
				<header className="relative flex items-center gap-3">
					<Link
						to="/"
						aria-label="Go back"
						className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20] dark:bg-[#ffb1c5]"
					>
						<ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]"/>
					</Link>
					<div className="flex flex-1 items-center justify-center">
						<div className="relative">
							<div
								className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
								style={{transform: "rotate(-3deg)"}}>
								<h1 className="text-base font-bold text-[#091828] dark:text-[#091828]">Quests</h1>
							</div>
							{isCoinBalanceOpen&&(
								<div
									id="quest-coin-balance"
									role="dialog"
									aria-label="Coin balance"
									className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center whitespace-nowrap rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 text-center shadow-[4px_4px_0_#091828] transition-opacity duration-300 ease-out dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d] ${isCoinBalanceFading?"opacity-0":"opacity-100"}`}
									style={{transform:"rotate(-3deg)"}}
								>
									<p className="text-base font-bold text-[#7A5A00] dark:text-[#5a4300]">
										{gamificationLoading?"Loading...":`${(gamificationProfile?.coins??0).toLocaleString("en-ZA")} coins`}
									</p>
								</div>
							)}
						</div>
					</div>
					<div className="relative shrink-0">
						<button
							type="button"
							aria-label="Show coin balance"
							aria-expanded={isCoinBalanceOpen}
							aria-controls="quest-coin-balance"
							onClick={handleCoinBalanceToggle}
							className="flex size-12 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFE9B5] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20] dark:bg-[#ffd166]/20"
						>
							<Coins className="size-5 text-[#7A5A00] dark:text-[#ffd166]"/>
						</button>
					</div>
				</header>
				<div className="mt-8 rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-5 py-5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20] dark:bg-[#2d1b2e]">
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#AC2A5D] dark:text-[#ff6b9d]">Your learning path</p>
					<h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#091828] dark:text-white">Choose your next quest.</h2>
					<p className="mt-1 text-sm leading-relaxed text-[#6b6375] dark:text-[#a0aec0]">Build your money knowledge and collect rewards as you go.</p>
				</div>
				{error &&(
					<div className="mt-6 flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFF1F4] px-4 py-3 dark:border-[#ffb4ab] dark:bg-[#93000a]/30">
						<AlertTriangle className="size-4 shrink-0 text-[#AC2A5D] dark:text-[#ffb4ab]"/>
						<p className="flex-1 text-sm font-semibold text-[#AC2A5D] dark:text-[#ffb4ab]">{pageError}</p>
						<button
							type="button"
							onClick={()=>{
								reload()
								refetchGamification()
							}}
							className="shrink-0 text-sm font-bold text-[#AC2A5D] underline dark:text-[#ffb4ab]"
						>
							Retry
						</button>
					</div>
				)}
				<section className="mt-7">
					<div className="mb-3 flex items-end justify-between">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b6375] dark:text-[#a0aec0]">Start here</p>
							<h2 className="mt-1 text-xl font-extrabold text-[#091828] dark:text-white">Quiz quests</h2>
						</div>
						<p className="text-xs font-semibold text-[#6b6375] dark:text-[#a0aec0]">Earn XP as you learn</p>
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
							onAction={handleDailyQuizAction}
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
							title="Financial Topic Quizzes"
							eyebrow="Choose your subject"
							description="Explore focused lessons and take a quiz when you're ready."
							progress={topicsProgress}
							progressLabel={`${availableTopics} of ${totalTopics} topics unlocked`}
							actionLabel="Explore topics"
							actionAriaLabel="Financial Topic Quizzes"
							onAction={()=>navigate("/quiz/topics")}
						/>
					)}
				</section>
			</div>
			<DailyQuizConfirmDialog
				open={isDailyQuizConfirmOpen}
				onCancel={()=>{
					if(!startingDailyQuiz){
						setIsDailyQuizConfirmOpen(false)
					}
				}}
				onConfirm={()=>void handleConfirmDailyQuiz()}
				isStarting={startingDailyQuiz}
				error={dailyQuizStartError}
				mode={dailyQuizConfirmMode}
				progress={daily?.status==="IN_PROGRESS"?daily.session.progress:undefined}
			/>
			<BottomNav/>
		</div>
	)
}

function DailyQuizConfirmDialog({
	open,
	onCancel,
	onConfirm,
	isStarting,
	error,
	mode,
	progress,
}:Readonly<{
	open:boolean
	onCancel:()=>void
	onConfirm:()=>void
	isStarting:boolean
	error:string|null
	mode:"START"|"RESUME"
	progress?:{
		answeredAttempts:number
		initialQuestions:number
	}
}>){
	if(!open){
		return null
	}
	return(
		<div
			className="fixed inset-0 z-40 flex items-end bg-[#091828]/55 px-5 pb-6 pt-16 dark:bg-black/70 sm:items-center sm:justify-center sm:p-6"
			onMouseDown={(event)=>{
				if(event.target===event.currentTarget&&!isStarting){
					onCancel()
				}
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="daily-quiz-confirm-title"
				className="w-full max-w-sm rounded-3xl border-2 border-[#091828] bg-[#FFF9FB] p-5 shadow-[6px_6px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[6px_6px_0_#060e20]"
			>
				<div className="flex size-11 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFD8E6] text-[#AC2A5D] dark:border-[#060e20] dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]">
					<CalendarCheck className="size-5"/>
				</div>
				<p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#AC2A5D] dark:text-[#ff6b9d]">Daily quiz</p>
				<h2 id="daily-quiz-confirm-title" className="mt-1 text-xl font-extrabold text-[#091828] dark:text-white">
					{mode==="RESUME"?"Continue where you left off?":"Ready to begin?"}
				</h2>
				<p className="mt-2 text-sm leading-relaxed text-[#6b6375] dark:text-[#a0aec0]">
					{mode==="RESUME"&&progress
						?`You have answered ${progress.answeredAttempts} of ${progress.initialQuestions} questions so far.`
						:"Your five-question quiz starts now. Once you begin, you can resume it later today."}
				</p>
				{error&&<p className="mt-3 rounded-xl border border-[#AC2A5D] bg-[#FFF1F4] px-3 py-2 text-sm font-semibold text-[#AC2A5D] dark:border-[#ffb4ab] dark:bg-[#93000a]/30 dark:text-[#ffb4ab]">{error}</p>}
				<div className="mt-5 grid grid-cols-2 gap-3">
					<LongButton LongVariant="outline" LongSize="sm" showArrow={false} onClick={onCancel} disabled={isStarting} className="dark:border-[#060e20] dark:bg-[#1c263c] dark:text-white dark:shadow-[3px_4px_0_#060e20] dark:hover:bg-[#2d3449]">
						Not yet
					</LongButton>
					<LongButton LongVariant="primaryDark" LongSize="sm" showArrow={false} onClick={onConfirm} disabled={isStarting} className="dark:bg-[#1e293b] dark:hover:bg-[#334155]">
						{isStarting?"Starting...":mode==="RESUME"?"Continue quiz":"Start quiz"}
					</LongButton>
				</div>
			</div>
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
	knowledgeStreak?:number
    onAction?:()=>void
    asLink?:boolean
    to?:string
    disabled?:boolean
}>){return (
	<CustomCard variant="navyShaddow" size="md" className="border-2 border-[#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[3px_4px_0_#060e20]">
		<div className="flex items-start gap-3">
			<QuestIcon tone={tone}>{icon}</QuestIcon>

			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b6375] dark:text-[#a0aec0]">
							{eyebrow}
						</p>
						<p className="mt-1 text-lg font-extrabold leading-tight text-[#091828] dark:text-white">
							{title}
						</p>
					</div>

					{(badgeLabel || (xp ?? 0) > 0) && (
						<CustomBadge variant="xp" size="sm" className="dark:border-[#060e20] dark:bg-[#ffd166] dark:shadow-[3px_4px_0_#060e20]">
							{badgeLabel ?? `+${xp} XP`}
						</CustomBadge>
					)}
				</div>

				<p className="mt-2 text-sm leading-relaxed text-[#6b6375] dark:text-[#a0aec0]">
					{description}
				</p>

				{progress !== undefined && (
					<div className="mt-4">
						<Progress value={progress} className="h-2" aria-label={progressLabel} />
						<p className="mt-1 text-[11px] font-semibold text-[#6b6375] dark:text-[#a0aec0]">
							{progressLabel}
						</p>
					</div>
				)}
			</div>
		</div>

		{knowledgeStreak !== undefined && (
			<div
				className="mt-4 rounded-2xl border border-[#FFD8E6] bg-[#FFF7F9] px-4 py-3 dark:border-[#ff6b9d]/30 dark:bg-[#1c263c]"
				data-testid="knowledge-streak"
			>
				<div className="grid grid-cols-[72px_1fr] items-center gap-4">
					<div className="flex justify-center">
						<StreakFlame days={knowledgeStreak} label="days" size="sm" />
					</div>

					<div className="min-w-0 text-center">
						<p className="text-[11px] font-bold uppercase tracking-wide text-[#AC2A5D] dark:text-[#ff6b9d]">
							Knowledge streak
						</p>
						<p className="mt-0.5 text-xs text-[#6b6375] dark:text-[#a0aec0]">
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
			className="mt-3 dark:bg-[#1e293b] dark:hover:bg-[#334155]"
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
}

function QuestCardSkeleton(){
	return(
		<CustomCard variant="greenShaddow" size="sm" className="dark:bg-[#131b2e] dark:shadow-none">
			<div className="flex items-start gap-3">
				<div className="size-10 shrink-0 animate-pulse rounded-full bg-[#DCEFE8] dark:bg-[#1c263c]"/>
				<div className="min-w-0 flex-1 space-y-2">
					<div className="h-4 w-1/2 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
					<div className="h-3 w-4/5 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
				</div>
			</div>
			<div className="mt-3 h-9 w-full animate-pulse rounded-full bg-[#DCEFE8] dark:bg-[#1c263c]"/>
		</CustomCard>
	)
}

function TopicCardSkeleton(){
	return(
		<CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3 dark:border-[#060e20] dark:bg-[#131b2e]">
			<div className="size-10 shrink-0 animate-pulse rounded-full bg-[#E8E4F4] dark:bg-[#1c263c]"/>
			<div className="min-w-0 flex-1 space-y-2">
				<div className="h-4 w-2/3 animate-pulse rounded bg-[#E8E4F4] dark:bg-[#1c263c]"/>
				<div className="h-3 w-4/5 animate-pulse rounded bg-[#E8E4F4] dark:bg-[#1c263c]"/>
				<div className="h-1.5 w-full animate-pulse rounded bg-[#E8E4F4] dark:bg-[#1c263c]"/>
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
        pink:"bg-[#FFD8E6] text-[#ac2a5d] dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]",
        mint:"bg-[#DCEFE8] text-[#091828] dark:bg-[#1c263c] dark:text-[#a0aec0]",
        yellow:"bg-[#FFE9B5] text-[#7a5a00] dark:bg-[#ffd166]/20 dark:text-[#ffd166]",
        lilac:"bg-[#E8E4F4] text-[#5b4d8b] dark:bg-[#9B7EDE]/20 dark:text-[#c5b3f0]",
    }
    return(
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneClass[tone]}`}>
			{children}
		</div>
	)
}
