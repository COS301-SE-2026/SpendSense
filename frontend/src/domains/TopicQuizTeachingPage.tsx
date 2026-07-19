import * as React from 'react'
import {useNavigate,useParams} from 'react-router-dom'
import {AlertTriangle,ChevronLeft} from 'lucide-react'
import {CustomCard} from '@/components/ui/CustomCard'
import {LongButton} from '@/components/common/LongButton'
import { useQuizTopicDetail } from '@/hooks/useQuizTopicDetail'
import { useQuizSession } from '@/hooks/useQuizSession'
import type {QuizTopic} from '../features/quiz/quizTypes'

const VALID_TOPICS:QuizTopic[]=[
	'BUDGETING',
	'CREDIT_SCORE',
	'INTEREST',
	'DEBT',
	'BNPL',
	'SUBSCRIPTIONS',
]

function isQuizTopic(value:string | undefined):value is QuizTopic {
	return !!value && (VALID_TOPICS as string[]).includes(value)
}

export default function TopicQuizTeachingPage() {
	const navigate=useNavigate()
	const {topic:topicParam}=useParams<{topic:string}>()
	const topic=isQuizTopic(topicParam)?topicParam:null
	const {detail,isLoading,error,reload}=useQuizTopicDetail(topic)
	const {startTopicQuiz,isLoading:isStarting,error:startError,clearError,}=useQuizSession()
	const handleBack=React.useCallback(()=>{navigate('/quiz/topics')},[navigate])
	const handleStart=React.useCallback(async ()=>{
		if (!topic) {
			return
		}
		clearError()
		const session=await startTopicQuiz(topic)
		if (session) {
			// TODO:point this at wherever the question screen actually lives once that route exists.
			navigate(`/quiz/session/${session.id}`)
		}
	},[topic,clearError,startTopicQuiz,navigate])
	if (!topic) {
		return (
			<div className="min-h-screen bg-[#F4FBF7] px-5 pt-6">
				<p className="text-sm font-semibold text-[#AC2A5D]">We couldn't find that quiz topic.</p>
				<button
					type="button"
					onClick={handleBack}
					className="mt-3 text-sm font-bold text-[#091828] underline"
				>
					Back to topics
				</button>
			</div>
		)
	}
	return (
		<div className="min-h-screen bg-[#F4FBF7] pb-24">
			<div className="mx-auto w-full max-w-md px-5 pt-6">
				<button
					type="button"
					onClick={handleBack}
					className="flex items-center gap-1 text-sm font-semibold text-[#6b6375] hover:text-[#091828]"
				>
					<ChevronLeft className="size-4"/>
					Back
				</button>
				{error && (
					<div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFD9E1] px-4 py-3">
						<AlertTriangle className="size-4 shrink-0 text-[#AC2A5D]"/>
						<p className="flex-1 text-sm font-semibold text-[#AC2A5D]">{error}</p>
						<button
							type="button"
							onClick={reload}
							className="shrink-0 text-sm font-bold text-[#AC2A5D] underline"
						>
							Retry
						</button>
					</div>
				)}
				{isLoading?(
					<TeachingSkeleton/>
				):detail?(
					<CustomCard variant="greenShaddow" size="sm" className="mt-4">
						<h1 className="text-xl font-extrabold text-[#091828]">
							{detail.teachingContent.title}
						</h1>
						<p className="mt-2 text-sm leading-relaxed text-[#6b6375]">{detail.teachingContent.body}</p>
						{detail.teachingContent.keyPoints.length>0 && (
							<ul className="mt-3 space-y-1.5">
								{detail.teachingContent.keyPoints.map((point,index)=>(
									<li
										key={index}
										className="flex items-start gap-2 text-sm text-[#091828]"
									>
										<span aria-hidden="true" className="mt-0.5 text-[#6b6375]">•</span>
										<span>{point}</span>
									</li>
								))}
							</ul>
						)}
					</CustomCard>
				):null}
				{startError && (
					<p className="mt-3 text-sm font-semibold text-[#AC2A5D]">
						{startError}
					</p>
				)}
				<LongButton
					LongVariant="primaryDark"
					LongSize="sm"
					className="mt-4"
					showArrow={false}
					disabled={isLoading||!detail||isStarting}
					onClick={handleStart}
				>
					{isStarting?'Starting…':'Start Topic Quiz'}
				</LongButton>
			</div>
		</div>
	)
}

function TeachingSkeleton() {
	return (
		<CustomCard variant="greenShaddow" size="sm" className="mt-4 space-y-3">
			<div className="h-6 w-2/3 animate-pulse rounded bg-[#DCEFE8]"/>
			<div className="h-4 w-full animate-pulse rounded bg-[#DCEFE8]"/>
			<div className="h-4 w-4/5 animate-pulse rounded bg-[#DCEFE8]"/>
			<div className="h-4 w-3/5 animate-pulse rounded bg-[#DCEFE8]"/>
		</CustomCard>
	)
}