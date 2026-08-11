import * as React from 'react'
import {useNavigate,useParams} from 'react-router-dom'
import {AlertTriangle,BookOpen,ChevronLeft,Clock3,Coins} from 'lucide-react'
import {LongButton} from '@/components/common/LongButton'
import {useQuizTopicDetail} from '@/hooks/useQuizTopicDetail'
import {useQuizSession} from '@/hooks/useQuizSession'
import type {QuizTopic} from '../features/quiz/quizTypes'

const VALID_TOPICS:QuizTopic[]=[
	'BUDGETING',
	'CREDIT_SCORE',
	'INTEREST',
	'DEBT',
	'BNPL',
	'SUBSCRIPTIONS',
]

const TOPIC_THEME:Record<QuizTopic,{panel:string;accent:string;iconBg:string}>={
	BUDGETING:{panel:'bg-[#D6EEE8] dark:bg-[#0f4f42]',accent:'text-[#0D9488] dark:text-[#5eead4]',iconBg:'bg-[#F4FBF7] dark:bg-[#0b1326]'},
	CREDIT_SCORE:{panel:'bg-[#E8D5F5] dark:bg-[#332352]',accent:'text-[#7C3AED] dark:text-[#c5b3f0]',iconBg:'bg-[#FAF6FD] dark:bg-[#0b1326]'},
	INTEREST:{panel:'bg-[#DCE8F7] dark:bg-[#1e3352]',accent:'text-[#1E4FAE] dark:text-[#9dc0ea]',iconBg:'bg-[#F5F8FD] dark:bg-[#0b1326]'},
	DEBT:{panel:'bg-[#FFD9E1] dark:bg-[#2d1b2e]',accent:'text-[#AC2A5D] dark:text-[#ff6b9d]',iconBg:'bg-[#FFF1F4] dark:bg-[#0b1326]'},
	BNPL:{panel:'bg-[#FFE7AE] dark:bg-[#3f2e00]',accent:'text-[#7A4A00] dark:text-[#ffd166]',iconBg:'bg-[#FFF9E9] dark:bg-[#0b1326]'},
	SUBSCRIPTIONS:{panel:'bg-[#DCEFE8] dark:bg-[#12463d]',accent:'text-[#16635A] dark:text-[#7fd8c4]',iconBg:'bg-[#F4FBF7] dark:bg-[#0b1326]'},
}

function isQuizTopic(value:string|undefined):value is QuizTopic{
	return !!value&&(VALID_TOPICS as string[]).includes(value)
}

export default function TopicQuizTeachingPage(){
	const navigate=useNavigate()
	const {topic:topicParam}=useParams<{topic:string}>()
	const topic=isQuizTopic(topicParam)?topicParam:null
	const theme=topic?TOPIC_THEME[topic]:TOPIC_THEME.BUDGETING
	const {detail,isLoading,error,reload}=useQuizTopicDetail(topic)
	const {startTopicQuiz,isLoading:isStarting,error:startError,clearError}=useQuizSession()
	const handleBack=React.useCallback(()=>{navigate('/quiz/topics')},[navigate])
	const handleStart=React.useCallback(async()=>{
		if(!topic) return
		clearError()
		const session=await startTopicQuiz(topic)
		if(session) navigate(`/quiz/session/${session.id}`)
	},[topic,clearError,startTopicQuiz,navigate])

	if(!topic){
		return(
			<div className="min-h-screen bg-[#F4FBF7] px-5 pb-24 pt-6 dark:bg-[#0b1326]">
				<div className="mx-auto w-full max-w-md">
					<Header onBack={handleBack} />
					<div className="mt-8 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFF1F4] p-5 shadow-[4px_4px_0_#AC2A5D] dark:border-[#ffb4ab] dark:bg-[#93000a]/30 dark:shadow-[4px_4px_0_#060e20]">
						<p className="text-sm font-bold text-[#AC2A5D] dark:text-[#ffb4ab]">We couldn't find that quiz topic.</p>
						<button type="button" onClick={handleBack} className="mt-4 text-sm font-bold text-[#091828] underline dark:text-white">Back to topics</button>
					</div>
				</div>
			</div>
		)
	}

	return(
		<div className="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
			<div className="mx-auto w-full max-w-md px-5 pt-6">
				<Header onBack={handleBack}/>

				{error&&(
					<div className="mt-6 flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFF1F4] px-4 py-3 dark:border-[#ffb4ab] dark:bg-[#93000a]/30">
						<AlertTriangle className="size-4 shrink-0 text-[#AC2A5D] dark:text-[#ffb4ab]"/>
						<p className="flex-1 text-sm font-semibold text-[#AC2A5D] dark:text-[#ffb4ab]">{error}</p>
						<button type="button" onClick={reload} className="text-sm font-bold text-[#AC2A5D] underline dark:text-[#ffb4ab]">Retry</button>
					</div>
				)}

				{isLoading?(
					<TeachingSkeleton/>
				):detail?(
					<>
						<section className={`mt-8 rounded-2xl border-2 border-[#091828] ${theme.panel} px-5 py-5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20]`}>
							<div className={`flex items-center gap-2 ${theme.accent}`}>
								<span className={`flex size-7 items-center justify-center rounded-full ${theme.iconBg}`}><BookOpen className="size-4"/></span>
								<p className="text-xs font-bold uppercase tracking-[0.14em]">Topic lesson</p>
							</div>
							<h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#091828] dark:text-white">{detail.name}</h2>
							<p className="mt-1 text-sm leading-relaxed text-[#6b6375] dark:text-[#a0aec0]">{detail.description}</p>
							<div className={`mt-4 flex items-center gap-4 border-t border-[#091828]/10 pt-3 dark:border-white/10 text-xs font-bold ${theme.accent}`}>
								<span className="inline-flex items-center gap-1"><Clock3 className="size-3.5"/> 5 min lesson</span>
								<span className="inline-flex items-center gap-1"><Coins className="size-3.5"/> Earn rewards</span>
							</div>
						</section>

						<section className="mt-5 rounded-2xl border-2 border-[#091828] bg-white p-5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20] dark:bg-[#131b2e]">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#AC2A5D] dark:text-[#ff6b9d]">Before you play</p>
							<h1 className="mt-2 text-xl font-extrabold leading-tight text-[#091828] dark:text-white">{detail.teachingContent.title}</h1>
							<p className="mt-3 text-sm leading-relaxed text-[#6b6375] dark:text-[#a0aec0]">{detail.teachingContent.body}</p>
							{detail.teachingContent.keyPoints.length>0&&(
								<ul className="mt-5 space-y-3">
									{detail.teachingContent.keyPoints.map((point,index)=>(
										<li key={index} className="flex items-start gap-3 text-sm leading-relaxed text-[#091828] dark:text-white">
											<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FFD9E1] text-xs font-extrabold text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]">{index+1}</span>
											<span>{point}</span>
										</li>
									))}
								</ul>
							)}
						</section>
					</>
				):null}

				{startError&&<p className="mt-4 text-sm font-semibold text-[#AC2A5D] dark:text-[#ffb4ab]">{startError}</p>}
				<LongButton
					LongVariant="primaryPinkBorder"
					LongSize="lg"
					className="mt-5 h-14 text-base tracking-wide shadow-[5px_6px_0_#0a1929] dark:shadow-[5px_6px_0_#060e20]"
					showArrow
					disabled={isLoading||!detail||isStarting}
					onClick={handleStart}
				>
					{isStarting?'Starting…':'Start Topic Quiz'}
				</LongButton>
			</div>
		</div>
	)
}

function Header({onBack}:{onBack:()=>void}){
	return(
		<header className="flex items-center gap-3">
			<button
				type="button"
				onClick={onBack}
				aria-label="Back"
				className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20] dark:bg-[#ffb1c5]"
			>
				<ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]"/>
			</button>
			<div className="flex flex-1 items-center justify-center">
				<div
					className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
					style={{transform: "rotate(-3deg)"}}>
					<span className="text-base font-bold text-[#091828] dark:text-[#091828]">Topic Quiz</span>
				</div>
			</div>
			<div className="size-12 shrink-0" aria-hidden="true"/>
		</header>
	)
}

function TeachingSkeleton(){
	return(
		<div className="mt-8 space-y-5">
			<div className="rounded-2xl border-2 border-[#DCEFE8] bg-white p-5 shadow-[4px_4px_0_#DCEFE8] dark:border-[#1c263c] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#1c263c]">
				<div className="h-3 w-1/3 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
				<div className="mt-3 h-7 w-3/5 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
				<div className="mt-3 h-4 w-full animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
				<div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
			</div>
			<div className="rounded-2xl border-2 border-[#DCEFE8] bg-white p-5 shadow-[4px_4px_0_#DCEFE8] dark:border-[#1c263c] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#1c263c]">
				<div className="h-3 w-1/3 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
				<div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
				<div className="mt-3 h-4 w-full animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
				<div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-[#DCEFE8] dark:bg-[#1c263c]"/>
			</div>
		</div>
	)
}