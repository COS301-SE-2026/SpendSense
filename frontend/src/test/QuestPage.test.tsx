import * as React from "react"
import{describe,it,expect,vi,beforeEach} from "vitest"
import{render,screen,within,waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import{MemoryRouter} from "react-router-dom"
import type{DailyQuizState,QuizTopicSummary,} from "../features/quiz/quizTypes"

type CustomCardMockProps=React.PropsWithChildren<
	React.HTMLAttributes<HTMLDivElement>&{
		variant?:string
		size?:string
	}
>
type ProgressMockProps=React.HTMLAttributes<HTMLDivElement>&{
	value?:number
}
type LongButtonMockProps=React.PropsWithChildren<
	React.ButtonHTMLAttributes<HTMLButtonElement>&{
		asChild?:boolean
		LongVariant?:string
		LongSize?:string
		showArrow?:boolean
	}
>
type CustomBadgeMockProps=React.PropsWithChildren<{
	variant?:string
	size?:string
}>
//mocks}
const mockNavigate=vi.fn()
const {mockStartDailyQuiz,mockClearDailyQuizError}=vi.hoisted(()=>({
	mockStartDailyQuiz:vi.fn(),
	mockClearDailyQuizError:vi.fn(),
}))
vi.mock("react-router-dom",async ()=>{
	const actual=await vi.importActual<typeof import("react-router-dom")>(
		"react-router-dom"
	)
	return{
		...actual,
		useNavigate:()=>mockNavigate,
	}
})

vi.mock("@/features/quiz/quizApi",()=>({
	getDailyQuiz:vi.fn(),
	getQuizTopics:vi.fn(),
}))

vi.mock("@/components/ui/CustomCard",()=>({
	CustomCard:({children,className,variant,size,...rest}:CustomCardMockProps)=>(
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

vi.mock("@/components/ui/progress",()=>({
	Progress:({value,className,...rest}:ProgressMockProps)=>(
		<div
			role="progressbar"
			aria-valuenow={value}
			className={className}
			{...rest}
		/>
	),
}))

vi.mock("@/components/common/LongButton",()=>({
	LongButton:(props:LongButtonMockProps)=>{
		const{
			children,
			asChild,
			onClick,
			disabled,
			LongVariant,
			LongSize,
			showArrow,
			...rest
		}=props
		void LongVariant
		void LongSize
		void showArrow
		if(asChild){
			return <>{children}</>
		}
		return(
			<button
				onClick={onClick}
				disabled={disabled}
				{...rest}
			>
				{children}
			</button>
		)
	},
}))

vi.mock("@/components/common/CustomBadges",()=>({
	CustomBadge:({children,variant,size}:CustomBadgeMockProps)=>(
		<span
			data-testid="custom-badge"
			data-variant={variant}
			data-size={size}
		>
			{children}
		</span>
	),
}))

vi.mock("@/components/common/AddTransactionButton",()=>({
	AddTransactionButton:()=>(
		<button data-testid="add-transaction-button">Add</button>
	),
}))

vi.mock("@/hooks/useGamificationProfile",()=>({
	useGamificationProfile:()=>({
		profile:{
			coins:145,
			knowledgeStreak:4,
		},
		loading:false,
		error:null,
		refetch:vi.fn(),
	}),
}))

vi.mock("@/hooks/useQuizSession",()=>({
	useQuizSession:()=>({
		startDailyQuiz:mockStartDailyQuiz,
		isLoading:false,
		error:null,
		clearError:mockClearDailyQuizError,
	}),
}))

import QuestsPage from "../domains/QuestsPage"
import{getDailyQuiz,getQuizTopics} from "../features/quiz/quizApi"

const mockedGetDailyQuiz=vi.mocked(getDailyQuiz)
const mockedGetQuizTopics=vi.mocked(getQuizTopics)

const notStartedDaily:DailyQuizState={
	date:"2026-07-21",
	status:"AVAILABLE",
	session:null,
	rewardPreview:{
		xp:10,
		coins:5,
	},
	knowledgeStreak:{
		current:4,
		longest:7,
	},
}

const inProgressDaily:DailyQuizState={
	date:"2026-07-21",
	status:"IN_PROGRESS",
	rewardPreview:{
		xp:15,
		coins:5,
	},
	session:{
		id:"session-1",
		type:"DAILY",
		status:"IN_PROGRESS",
		progress:{
			correct:1,
			answeredAttempts:2,
			initialQuestions:5,
			remainingQueue:4,
		},
	},
}

const completedDaily:DailyQuizState={
	date:"2026-07-21",
	status:"COMPLETED",
	session:{
		id:"session-1",
		type:"DAILY",
		status:"COMPLETED",
		score:5,
		totalQuestions:5,
		completedAt:"2026-07-21T10:00:00.000Z",
	},
	reward:{
		xp:20,
		coins:5,
	},
}

const topicsFixture:QuizTopicSummary[]=[
	{
		key:"BUDGETING",
		name:"Budgeting",
		description:"Learn budgeting",
		available:true,
		questionCount:5,
		rewardPreview:{xp:10,coins:5},
	},{
		key:"CREDIT_SCORE",
		name:"Credit Score",
		description:"Learn credit scores",
		available:true,
		questionCount:5,
		rewardPreview:{xp:10,coins:5},
	},{
		key:"INTEREST",
		name:"Interest",
		description:"Learn interest",
		available:false,
		questionCount:0,
		rewardPreview:null,
	},{
		key:"DEBT",
		name:"Debt",
		description:"Learn debt",
		available:false,
		questionCount:0,
		rewardPreview:null,
	},
]

function renderPage(){
	return render(
		<MemoryRouter>
			<QuestsPage />
		</MemoryRouter>
	)
}

function pendingPromise<T>(){
	return new Promise<T>(()=>{})
}

beforeEach(()=>{
	vi.clearAllMocks()
	mockStartDailyQuiz.mockResolvedValue({id:"daily-session-1"})
})

//tests
describe("QuestsPage",()=>{
	it("shows loading skeletons while data is in flight",async ()=>{
		mockedGetDailyQuiz.mockReturnValue(pendingPromise())
		mockedGetQuizTopics.mockReturnValue(pendingPromise())
		const{container}=renderPage()
		expect(screen.getByRole("heading",{ level:1,name:"Quests" })).toBeInTheDocument()
		expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
		expect(screen.queryByText("Check in")).not.toBeInTheDocument()
		expect(screen.queryByText("Financial Topic Quizzes")).not.toBeInTheDocument()
	})
	it("renders the default 'Check in' state when the daily quiz hasn't been started",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()
		expect(await screen.findByText("Complete your Daily quiz to build your streak!")).toBeInTheDocument()
		expect(screen.getByText("+10 XP")).toBeInTheDocument()
		const button=screen.getByRole("button",{name:"Check in"})
		expect(button).toBeEnabled()
		await userEvent.click(button)
		expect(screen.getByRole("dialog",{name:"Ready to begin?"})).toBeInTheDocument()
		expect(mockNavigate).not.toHaveBeenCalled()
		await userEvent.click(screen.getByRole("button",{name:"Start quiz"}))
		await waitFor(()=>expect(mockNavigate).toHaveBeenCalledWith("/quiz/session/daily-session-1"))
	})
	it("renders the 'Resume' state with progress copy when a quiz is in progress",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(inProgressDaily)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()
		expect(await screen.findByText("In progress - 2 of 5 answered so far.")).toBeInTheDocument()
		expect(screen.getByText("+15 XP")).toBeInTheDocument()
		const button=screen.getByRole("button",{name:"Resume"})
		expect(button).toBeEnabled()
		await userEvent.click(button)
		expect(screen.getByRole("dialog",{name:"Continue where you left off?"})).toBeInTheDocument()
		expect(screen.getByText("You have answered 2 of 5 questions so far.")).toBeInTheDocument()
		await userEvent.click(screen.getByRole("button",{name:"Continue quiz"}))
		expect(mockNavigate).toHaveBeenCalledWith("/quiz/session/session-1")
	})
	it("renders a disabled 'Completed' state once today's quiz is done",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(completedDaily)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()
		expect(await screen.findByText("You've completed today's quiz. Come back tomorrow!")).toBeInTheDocument()
		expect(screen.getByText("+20 XP")).toBeInTheDocument()
		const button=screen.getByRole("button",{name:"Completed"})
		expect(button).toBeDisabled()
	})

	it("computes and displays topic unlock progress,and navigates to the topics list on click",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()
		expect(await screen.findByText("Financial Topic Quizzes")).toBeInTheDocument()
		const progressBar=screen.getByRole("progressbar")
		expect(progressBar).toHaveAttribute("aria-valuenow","50")
		expect(screen.getByText(/2 of/)).toBeInTheDocument()
		expect(screen.getByText(/4 topics unlocked/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole("button",{name:/Financial Topic Quizzes/i}))
		expect(mockNavigate).toHaveBeenCalledWith("/quiz/topics")
	})
	it("handles an empty topics list without dividing by zero",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily)
		mockedGetQuizTopics.mockResolvedValue([])
		renderPage()
		await screen.findByText("Financial Topic Quizzes")
		const progressBar=screen.getByRole("progressbar")
		expect(progressBar).toHaveAttribute("aria-valuenow","0")
		expect(screen.getByText(/0 of/)).toBeInTheDocument()
		expect(screen.getByText(/0 topics unlocked/)).toBeInTheDocument()
	})
	it("shows an error banner when loading fails,and retries on demand",async ()=>{
		mockedGetDailyQuiz.mockRejectedValueOnce(new Error("Network error"))
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()
		expect(await screen.findByText("Network error")).toBeInTheDocument()
		expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(1)
		mockedGetDailyQuiz.mockResolvedValueOnce(notStartedDaily)
		await userEvent.click(screen.getByRole("button",{name:"Retry"}))
		await waitFor(()=>expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(2))
		await waitFor(()=>expect(screen.queryByText("Network error")).not.toBeInTheDocument())
		expect(await screen.findByText("Complete your Daily quiz to build your streak!")).toBeInTheDocument()
	})
	it("falls back to a generic error message when a non-Error value is thrown",async ()=>{
		mockedGetDailyQuiz.mockRejectedValueOnce("boom")
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()
		expect(await screen.findByText("Failed to load quests.")).toBeInTheDocument()
	})
	it("ignores aborted requests and does not surface an error",async ()=>{
		const abortError=new Error("aborted")
		abortError.name="AbortError"
		mockedGetDailyQuiz.mockRejectedValueOnce(abortError)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()
		await screen.findByText("Financial Topic Quizzes")
		expect(screen.queryByText(/AbortError/)).not.toBeInTheDocument()
		expect(screen.queryByRole("button",{name:"Retry"})).not.toBeInTheDocument()
	})
	it("renders bottom navigation with the correct links",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()
		await screen.findByText("Financial Topic Quizzes")
		const nav=screen.getByRole("navigation",{name:"Primary"})
		const home=within(nav).getByRole("link",{name:/Home/i})
		const calendar=within(nav).getByRole("link",{name:/Calendar/i})
		const friends=within(nav).getByRole("link",{name:/Friends/i})
		const mascot=within(nav).getByRole("link",{name:/Mascot/i})
		expect(home).toHaveAttribute("href","/")
		expect(calendar).toHaveAttribute("href","/calendar")
		expect(friends).toHaveAttribute("href","/friends")
		expect(mascot).toHaveAttribute("href","/mascot")
		expect(home).not.toHaveAttribute("aria-current")
		expect(calendar).not.toHaveAttribute("aria-current")
		expect(friends).not.toHaveAttribute("aria-current")
		expect(mascot).not.toHaveAttribute("aria-current")
		expect(within(nav).getByTestId("add-transaction-button")).toBeInTheDocument()
	})
	it("renders a back arrow link to the home page",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()

		expect(await screen.findByRole("link",{name:"Go back"})).toHaveAttribute("href","/")
	})
	it("shows the current coin balance in a popup",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture)
		renderPage()

		const coinButton=await screen.findByRole("button",{name:"Show coin balance"})
		expect(screen.queryByRole("dialog",{name:"Coin balance"})).not.toBeInTheDocument()
		await userEvent.click(coinButton)
		expect(screen.getByRole("dialog",{name:"Coin balance"})).toHaveTextContent("145 coins")
		expect(coinButton).toHaveAttribute("aria-expanded","true")
		await userEvent.click(coinButton)
		expect(screen.queryByRole("dialog",{name:"Coin balance"})).not.toBeInTheDocument()
	})
})