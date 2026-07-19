import * as React from "react"
import{describe,it,expect,vi,beforeEach} from "vitest"
import{render,screen,within,waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import{MemoryRouter} from "react-router-dom"

//mocks}
const mockNavigate=vi.fn()
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
	CustomCard:({children,className,variant,size,...rest}:any)=>(
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
	Progress:({value,className,...rest}:any)=>(
		<div
			role="progressbar"
			aria-valuenow={value}
			className={className}
			{...rest}
		/>
	),
}))

vi.mock("@/components/common/LongButton",()=>({
	LongButton:({children,asChild,onClick,disabled,...rest}:any)=>{
		if (asChild){
			return <>{children}</>
		}
		return (
			<button onClick={onClick} disabled={disabled}{...rest}>
				{children}
			</button>
		)
	},
}))

vi.mock("@/components/common/CustomBadges",()=>({
	CustomBadge:({children,variant,size}:any)=>(
		<span data-testid="custom-badge" data-variant={variant} data-size={size}>
			{children}
		</span>
	),
}))

vi.mock("@/components/common/AddTransactionButton",()=>({
	AddTransactionButton:()=>(
		<button data-testid="add-transaction-button">Add</button>
	),
}))

import QuestsPage from "../domains/QuestsPage"
import{getDailyQuiz,getQuizTopics} from "../features/quiz/quizApi"

const mockedGetDailyQuiz=vi.mocked(getDailyQuiz)
const mockedGetQuizTopics=vi.mocked(getQuizTopics)

const notStartedDaily={
	status:"NOT_STARTED",
	rewardPreview:{xp:10},
}

const inProgressDaily={
	status:"IN_PROGRESS",
	rewardPreview:{xp:15},
	session:{progress:{answeredAttempts:2,initialQuestions:5}},
}

const completedDaily={
	status:"COMPLETED",
	reward:{xp:20},
}

const topicsFixture=[
	{id:"t1",available:true},
	{id:"t2",available:true},
	{id:"t3",available:false},
	{id:"t4",available:false},
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
		expect(screen.queryByText("Financial Topic Quizes")).not.toBeInTheDocument()
	})
	it("renders the default 'Check in' state when the daily quiz hasn't been started",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily as any)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		expect(await screen.findByText("Complete your Daily quiz to build your streak!")).toBeInTheDocument()
		expect(screen.getByText("+10 XP")).toBeInTheDocument()
		const button=screen.getByRole("button",{name:"Check in"})
		expect(button).toBeEnabled()
		await userEvent.click(button)
		expect(mockNavigate).toHaveBeenCalledWith("/quiz")
	})
	it("renders the 'Resume' state with progress copy when a quiz is in progress",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(inProgressDaily as any)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		expect(await screen.findByText("In progress - 2 of 5 answered so far.")).toBeInTheDocument()
		expect(screen.getByText("+15 XP")).toBeInTheDocument()
		const button=screen.getByRole("button",{name:"Resume"})
		expect(button).toBeEnabled()
		await userEvent.click(button)
		expect(mockNavigate).toHaveBeenCalledWith("/quiz")
	})
	it("renders a disabled 'Completed' state once today's quiz is done",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(completedDaily as any)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		expect(await screen.findByText("You've completed today's quiz. Come back tomorrow!")).toBeInTheDocument()
		expect(screen.getByText("+20 XP")).toBeInTheDocument()
		const button=screen.getByRole("button",{name:"Completed"})
		expect(button).toBeDisabled()
	})

	it("computes and displays topic unlock progress,and navigates to the topics list on click",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily as any)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		expect(await screen.findByText("Financial Topic Quizes")).toBeInTheDocument()
		const progressBar=screen.getByRole("progressbar")
		expect(progressBar).toHaveAttribute("aria-valuenow","50")
		expect(screen.getByText(/2 of/)).toBeInTheDocument()
		expect(screen.getByText(/4 topics unlocked/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole("button",{name:/Financial Topic Quizes/i}))
		expect(mockNavigate).toHaveBeenCalledWith("/quiz/topics")
	})
	it("handles an empty topics list without dividing by zero",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily as any)
		mockedGetQuizTopics.mockResolvedValue([] as any)
		renderPage()
		await screen.findByText("Financial Topic Quizes")
		const progressBar=screen.getByRole("progressbar")
		expect(progressBar).toHaveAttribute("aria-valuenow","0")
		expect(screen.getByText(/0 of/)).toBeInTheDocument()
		expect(screen.getByText(/0 topics unlocked/)).toBeInTheDocument()
	})
	it("shows an error banner when loading fails,and retries on demand",async ()=>{
		mockedGetDailyQuiz.mockRejectedValueOnce(new Error("Network error"))
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		expect(await screen.findByText("Network error")).toBeInTheDocument()
		expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(1)
		mockedGetDailyQuiz.mockResolvedValueOnce(notStartedDaily as any)
		await userEvent.click(screen.getByRole("button",{name:"Retry"}))
		await waitFor(()=>expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(2))
		await waitFor(()=>expect(screen.queryByText("Network error")).not.toBeInTheDocument())
		expect(await screen.findByText("Complete your Daily quiz to build your streak!")).toBeInTheDocument()
	})
	it("falls back to a generic error message when a non-Error value is thrown",async ()=>{
		mockedGetDailyQuiz.mockRejectedValueOnce("boom")
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		expect(await screen.findByText("Failed to load quests.")).toBeInTheDocument()
	})
	it("ignores aborted requests and does not surface an error",async ()=>{
		const abortError=new Error("aborted")
		abortError.name="AbortError"
		mockedGetDailyQuiz.mockRejectedValueOnce(abortError)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		await screen.findByText("Financial Topic Quizes")
		expect(screen.queryByText(/AbortError/)).not.toBeInTheDocument()
		expect(screen.queryByRole("button",{name:"Retry"})).not.toBeInTheDocument()
	})
	it("renders the Rewards row as a static entry point",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily as any)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		expect(await screen.findByText("Rewards")).toBeInTheDocument()
		expect(screen.getByText("Redeem your coins and claim exclusive perks.")).toBeInTheDocument()
	})
	it("renders bottom navigation with Quests marked active and correct links",async ()=>{
		mockedGetDailyQuiz.mockResolvedValue(notStartedDaily as any)
		mockedGetQuizTopics.mockResolvedValue(topicsFixture as any)
		renderPage()
		await screen.findByText("Financial Topic Quizes")
		const nav=screen.getByRole("navigation",{name:"Primary"})
		const home=within(nav).getByRole("link",{name:/Home/i})
		const calendar=within(nav).getByRole("link",{name:/Calendar/i})
		const quests=within(nav).getByRole("link",{name:/Quests/i})
		const profile=within(nav).getByRole("link",{name:/Profile/i})
		expect(home).toHaveAttribute("href","/")
		expect(calendar).toHaveAttribute("href","/calendar")
		expect(quests).toHaveAttribute("href","/quests")
		expect(profile).toHaveAttribute("href","/profile")
		expect(quests).toHaveAttribute("aria-current","page")
		expect(home).not.toHaveAttribute("aria-current")
		expect(within(nav).getByTestId("add-transaction-button")).toBeInTheDocument()
	})
})