import * as React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import { MemoryRouter } from "react-router-dom"

//mocked
const mockNavigate=vi.fn()
let mockTopicParam:string | undefined="BUDGETING"

vi.mock("react-router-dom", async ()=>{
	const actual=await vi.importActual<typeof import("react-router-dom")>(
		"react-router-dom"
	)
	return {
		...actual,
		useNavigate:()=>mockNavigate,
		useParams:()=>({ topic:mockTopicParam }),
	}
})

vi.mock("@/hooks/useQuizTopicDetail", ()=>({
	useQuizTopicDetail:vi.fn(),
}))

vi.mock("@/hooks/useQuizSession", ()=>({
	useQuizSession:vi.fn(),
}))

vi.mock("@/components/ui/CustomCard", ()=>({
	CustomCard:({ children, className, variant, size, ...rest }:any)=>(
		<div
			data-testid="custom-card"
			data-variant={variant}
			data-size={size}
			className={className}
			{...rest}
		>
			{children}
		</div>
	),
}))

vi.mock("@/components/common/LongButton", ()=>({
	LongButton:({
		children,
		asChild,
		onClick,
		disabled,
		className,
		LongVariant:_longVariant,
		LongSize:_longSize,
		showArrow:_showArrow,
		...rest
	}:any)=>{
		if (asChild) {
			return <>{children}</>
		}
		return (
			<button
				onClick={onClick}
				disabled={disabled}
				className={className}
				{...rest}
			>
				{children}
			</button>
		)
	},
}))

import QuizTopicTeachingPage from "../domains/TopicQuizTeachingPage"
import { useQuizTopicDetail } from "../hooks/useQuizTopicDetail"
import { useQuizSession } from "../hooks/useQuizSession"
import type { QuizTopicDetail } from "../features/quiz/quizTypes"

const mockedUseQuizTopicDetail=vi.mocked(useQuizTopicDetail)
const mockedUseQuizSession=vi.mocked(useQuizSession)

const topicDetailFixture:QuizTopicDetail={
	key:"BUDGETING",
	name:"Budgeting",
	description:"Learn to budget",
	teachingContent:{
		title:"How Budgets Work",
		body:"A budget tells your money where to go.",
		keyPoints:["Track income", "Track expenses", "Review monthly"],
	},
	available:true,
	questionCount:5,
}

function detailState(overrides:Partial<ReturnType<typeof useQuizTopicDetail>>={}) {
	return {
		detail:topicDetailFixture,
		isLoading:false,
		error:null,
		reload:vi.fn(),
		...overrides,
	} as ReturnType<typeof useQuizTopicDetail>
}

function sessionState(overrides:Partial<ReturnType<typeof useQuizSession>>={}) {
	return {
		session:null,
		currentQuestion:null,
		feedback:null,
		nextQuestion:null,
		result:null,
		isLoading:false,
		isSubmitting:false,
		error:null,
		startSession:vi.fn(),
		startDailyQuiz:vi.fn(),
		startTopicQuiz:vi.fn(),
		resumeSession:vi.fn(),
		answerQuestion:vi.fn(),
		continueToNextQuestion:vi.fn(),
		clearError:vi.fn(),
		resetSession:vi.fn(),
		cancelRequests:vi.fn(),
		...overrides,
	} as ReturnType<typeof useQuizSession>
}

function renderPage() {
	return render(
		<MemoryRouter>
			<QuizTopicTeachingPage />
		</MemoryRouter>
	)
}

beforeEach(()=>{
	vi.clearAllMocks()
	mockTopicParam="BUDGETING"
	mockedUseQuizTopicDetail.mockReturnValue(detailState())
	mockedUseQuizSession.mockReturnValue(sessionState())
})

//tests
describe("QuizTopicTeachingPage", ()=>{
	it("shows a not-found message and returns to the topic picker for an invalid topic param", async ()=>{
		mockTopicParam="NOT_A_REAL_TOPIC"
		renderPage()
		expect(screen.getByText("We couldn't find that quiz topic.")).toBeInTheDocument()
		await userEvent.click(screen.getByRole("button", { name:"Back to topics" }))
		expect(mockNavigate).toHaveBeenCalledWith("/quiz/topics")
		expect(mockedUseQuizTopicDetail).toHaveBeenCalledWith(null)
	})
	it("treats a missing topic param the same as an invalid one", ()=>{
		mockTopicParam=undefined
		renderPage()
		expect(screen.getByText("We couldn't find that quiz topic.")).toBeInTheDocument()
		expect(mockedUseQuizTopicDetail).toHaveBeenCalledWith(null)
	})
	it("passes the valid topic through to the detail hook", ()=>{
		renderPage()
		expect(mockedUseQuizTopicDetail).toHaveBeenCalledWith("BUDGETING")
	})
	it("shows loading skeletons while teaching content is in flight", ()=>{
		mockedUseQuizTopicDetail.mockReturnValue(detailState({ detail:null, isLoading:true }))
		const { container }=renderPage()
		expect(screen.queryByText("How Budgets Work")).not.toBeInTheDocument()
		expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
		const startButton=screen.getByRole("button", { name:"Start Topic Quiz" })
		expect(startButton).toBeDisabled()
	})
	it("renders the topic title, body, and key points once loaded", ()=>{
		renderPage()
		expect(screen.getByRole("heading", { name:"How Budgets Work" })).toBeInTheDocument()
		expect(screen.getByText("A budget tells your money where to go.")).toBeInTheDocument()
		expect(screen.getByText("Track income")).toBeInTheDocument()
		expect(screen.getByText("Track expenses")).toBeInTheDocument()
		expect(screen.getByText("Review monthly")).toBeInTheDocument()
	})
	it("omits the key points list entirely when there are none", ()=>{
		mockedUseQuizTopicDetail.mockReturnValue(
			detailState({
				detail:{
					...topicDetailFixture,
					teachingContent:{
						...topicDetailFixture.teachingContent,
						keyPoints:[],
					},
				},
			})
		)
		renderPage()
		expect(screen.queryByRole("list")).not.toBeInTheDocument()
	})
	it("shows a fetch error with a working retry action", async ()=>{
		const reload=vi.fn()
		mockedUseQuizTopicDetail.mockReturnValue(
			detailState({ detail:null, error:"Network error", reload })
		)
		renderPage()
		expect(screen.getByText("Network error")).toBeInTheDocument()
		await userEvent.click(screen.getByRole("button", { name:"Retry" }))
		expect(reload).toHaveBeenCalledTimes(1)
	})
	it("navigates back to the topic picker when Back is clicked", async ()=>{
		renderPage()
		await userEvent.click(screen.getByRole("button", { name:/Back/i }))
		expect(mockNavigate).toHaveBeenCalledWith("/quiz/topics")
	})
	it("disables Start Topic Quiz while a session is being started", ()=>{
		mockedUseQuizSession.mockReturnValue(sessionState({ isLoading:true }))
		renderPage()
		expect(screen.getByRole("button", { name:"Starting…" })).toBeDisabled()
	})
	it("starts a topic session and navigates to the session screen on success", async ()=>{
		const startTopicQuiz=vi.fn().mockResolvedValue({
			id:"sess_123",
			type:"TOPIC",
			topic:"BUDGETING",
			status:"IN_PROGRESS",
			startedAt:"2026-07-19T00:00:00.000Z",
			completedAt:null,
			progress:{
				correct:0,
				answeredAttempts:0,
				initialQuestions:5,
				remainingQueue:5,
			},
			currentQuestion:null,
		})
		const clearError=vi.fn()
		mockedUseQuizSession.mockReturnValue(
			sessionState({ startTopicQuiz, clearError })
		)
		renderPage()
		await userEvent.click(screen.getByRole("button", { name:"Start Topic Quiz" }))
		expect(clearError).toHaveBeenCalledTimes(1)
		expect(startTopicQuiz).toHaveBeenCalledWith("BUDGETING")
		expect(mockNavigate).toHaveBeenCalledWith("/quiz/session/sess_123")
	})
	it("does not navigate if starting the session fails (returns null)", async ()=>{
		const startTopicQuiz=vi.fn().mockResolvedValue(null)
		mockedUseQuizSession.mockReturnValue(sessionState({ startTopicQuiz }))
		renderPage()
		await userEvent.click(screen.getByRole("button", { name:"Start Topic Quiz" }))
		expect(startTopicQuiz).toHaveBeenCalledWith("BUDGETING")
		expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/session/"))
	})
	it("shows a session-start error message beneath the button", ()=>{
		mockedUseQuizSession.mockReturnValue(
			sessionState({ error:"Could not start quiz" })
		)
		renderPage()
		expect(screen.getByText("Could not start quiz")).toBeInTheDocument()
	})
})