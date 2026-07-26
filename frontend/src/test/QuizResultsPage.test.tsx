import React from "react"
import {beforeEach,describe,expect,it,vi} from "vitest"
import {render,screen,waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {MemoryRouter,Route,Routes} from "react-router-dom"
import QuizResultsPage from "../domains/QuizResultsPage"
import {useQuizSession} from "../hooks/useQuizSession"
import type {QuizSession,QuizSessionResult} from "../features/quiz/quizTypes"

vi.mock("@/hooks/useQuizSession",()=>({
    useQuizSession:vi.fn(),
}))

const mockedUseQuizSession=vi.mocked(useQuizSession)

const advancedResult:QuizSessionResult={
    score:4,
    totalQuestions:5,
    answeredAttempts:7,
    reward:{
        xp:50,
        coins:25,
    },
    knowledgeStreak:{
        previous:2,
        current:3,
        longest:7,
        advanced:true,
    },
}

const steadyResult:QuizSessionResult={
    score:5,
    totalQuestions:5,
    answeredAttempts:5,
    reward:{
        xp:20,
        coins:10,
    },
    knowledgeStreak:{
        previous:6,
        current:6,
        longest:6,
        advanced:false,
    },
}

const dailySession:QuizSession={
    id:"session-1",
    type:"DAILY",
    topic:null,
    status:"COMPLETED",
    startedAt:"2026-07-20T08:00:00.000Z",
    completedAt:"2026-07-20T08:12:00.000Z",
    progress:{
        correct:4,
        answeredAttempts:7,
        initialQuestions:5,
        remainingQueue:0,
    },
    currentQuestion:null,
    result:advancedResult,
}

const topicSession:QuizSession={
    ...dailySession,
    type:"TOPIC",
    topic:"CREDIT_SCORE",
    result:steadyResult,
}

const resumeSession=vi.fn()

function mockHook(overrides:Partial<ReturnType<typeof useQuizSession>>={}){
    mockedUseQuizSession.mockReturnValue({
        session:dailySession,
        currentQuestion:null,
        feedback:null,
        nextQuestion:null,
        result:advancedResult,
        isLoading:false,
        isSubmitting:false,
        error:null,
        startSession:vi.fn(),
        startDailyQuiz:vi.fn(),
        startTopicQuiz:vi.fn(),
        resumeSession,
        answerQuestion:vi.fn(),
        continueToNextQuestion:vi.fn(),
        clearError:vi.fn(),
        resetSession:vi.fn(),
        cancelRequests:vi.fn(),
        ...overrides,
    })
}

function renderPage(initialEntry="/quiz/session/session-1/results"){
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route
                    path="/quiz/session/:sessionId/results"
                    element={<QuizResultsPage/>}
                />

                <Route
                    path="/quiz/session/:sessionId"
                    element={<div>Question screen</div>}
                />

                <Route
                    path="/quests"
                    element={<div>Quests screen</div>}
                />

                <Route
                    path="/"
                    element={<div>Dashboard screen</div>}
                />
            </Routes>
        </MemoryRouter>
    )
}

describe("QuizResultsPage",()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        resumeSession.mockResolvedValue(dailySession)
        mockHook()
    })
    it("fetches the session using the session id from the url",async()=>{
        renderPage()
        await waitFor(()=>{
            expect(resumeSession).toHaveBeenCalledWith("session-1")
        })
    })
    it("renders the loading skeleton while the session loads",()=>{
        mockHook({
            session:null,
            result:null,
            isLoading:true,
        })
        const {container}=renderPage()
        expect(container.querySelector(".animate-pulse")).toBeInTheDocument()
        expect(screen.queryByText("Correct answers")).not.toBeInTheDocument()
    })
    it("shows the correct-answer count and total questions",()=>{
        renderPage()
        expect(screen.getByText((_,element)=>element?.textContent==="4/5")).toBeInTheDocument()
        expect(screen.getByText("Correct answers")).toBeInTheDocument()
    })
    it("shows an attempts note when the session had requeues",()=>{
        renderPage()
        expect(screen.getByText(/it took 7 attempts to get there/i)).toBeInTheDocument()
    })
    it("does not show an attempts note when there were no requeues",()=>{
        mockHook({
            session:topicSession,
            result:steadyResult,
        })
        renderPage()
        expect(screen.queryByText(/attempts to get there/i)).not.toBeInTheDocument()
    })
    it("shows the xp and coins earned",()=>{
        renderPage()
        expect(screen.getByText("+50 XP")).toBeInTheDocument()
        expect(screen.getByText("+25 Coins")).toBeInTheDocument()
    })
    it("shows a generic completion message for a daily quiz",()=>{
        renderPage()
        expect(screen.getByText("You've finished today's quiz.")).toBeInTheDocument()
    })
    it("shows a topic-specific completion message for a topic quiz",()=>{
        mockHook({
            session:topicSession,
            result:steadyResult,
        })
        renderPage()
        expect(screen.getByText("You've finished the Credit Score quiz.")).toBeInTheDocument()
    })
    it("shows the streak advance treatment when the knowledge streak advanced",()=>{
        renderPage()
        expect(screen.getByText("2")).toBeInTheDocument()
        expect(screen.getByText("3")).toBeInTheDocument()
        expect(screen.getByText("Your streak went up! 🔥")).toBeInTheDocument()
    })
    it("shows a plain streak with no change implied for a topic quiz",()=>{
        mockHook({
            session:topicSession,
            result:steadyResult,
        })
        renderPage()
        expect(screen.getByText("6")).toBeInTheDocument()
        expect(screen.queryByText(/streak went up/i)).not.toBeInTheDocument()
        expect(screen.queryByText("was")).not.toBeInTheDocument()
    })
    it("redirects back to the question screen when the session has no result yet",async()=>{
        mockHook({
            session:{...dailySession,status:"IN_PROGRESS",result:null,},
            result:null,
        })
        renderPage()
        expect(await screen.findByText("Question screen")).toBeInTheDocument()
    })
    it("shows an error and lets the user retry",async()=>{
        const user=userEvent.setup()
        mockHook({
            session:null,
            result:null,
            error:"Failed to load quiz results.",
        })
        renderPage()
        expect(screen.getByText("Failed to load quiz results.")).toBeInTheDocument()
        await user.click(screen.getByRole("button",{name:"Retry",}))
        expect(resumeSession).toHaveBeenCalledWith("session-1")
    })
    it("shows an unavailable message when there is no session id in the url",()=>{
        render(
            <MemoryRouter initialEntries={["/quiz/results"]}>
                <Routes>
                    <Route
                        path="/quiz/results"
                        element={<QuizResultsPage/>}
                    />
                </Routes>
            </MemoryRouter>
        )
        expect(screen.getByText("This quiz session is invalid.")).toBeInTheDocument()
    })
    it("exits back to quests",async()=>{
        const user=userEvent.setup()
        renderPage()
        await user.click(screen.getByRole("link",{name:"Exit quiz",}))
        expect(await screen.findByText("Quests screen")).toBeInTheDocument()
    })
    it("links back to quests and to the dashboard",async()=>{
        const user=userEvent.setup()
        renderPage()
        await user.click(screen.getByRole("link",{name:"Back to Quests",}))
        expect(await screen.findByText("Quests screen")).toBeInTheDocument()
    })
    it("links to the dashboard",async()=>{
        const user=userEvent.setup()
        renderPage()
        await user.click(screen.getByRole("link",{name:"View Dashboard",}))
        expect(await screen.findByText("Dashboard screen")).toBeInTheDocument()
    })
})