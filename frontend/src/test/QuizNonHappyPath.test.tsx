import React from "react"
import {beforeEach,describe,expect,it,vi} from "vitest"
import {render,screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
    MemoryRouter,
    Route,
    Routes,
} from "react-router-dom"
import QuizQuestionPage from "../domains/QuizQuestionPage"
import TopicQuizTeachingPage from "../domains/TopicQuizTeachingPage"
import QuizResultsPage from "../domains/QuizResultsPage"
import type {
    QuizSession,
    QuizSessionResult,
} from "../features/quiz/quizTypes"
import {
    getQuizSession,
    getQuizTopic,
} from "../features/quiz/quizApi"

vi.mock("../features/quiz/quizApi",()=>({
    getQuizSession:vi.fn(),
    getQuizTopic:vi.fn(),
    createQuizSession:vi.fn(),
    submitQuizAnswer:vi.fn(),
}))

const mockedGetQuizSession=vi.mocked(getQuizSession)
const mockedGetQuizTopic=vi.mocked(getQuizTopic)

const activeSession:QuizSession={
    id:"session-123",
    type:"DAILY",
    topic:null,
    status:"IN_PROGRESS",
    startedAt:"2026-07-20T08:00:00.000Z",
    completedAt:null,
    progress:{
        correct:1,
        answeredAttempts:1,
        initialQuestions:5,
        remainingQueue:4,
    },
    currentQuestion:{
        id:"question-2",
        number:2,
        topic:"BUDGETING",
        prompt:"What is a budget?",
        options:[
            {
                key:"A",
                text:"A plan for income and expenses",
            },
            {
                key:"B",
                text:"A type of loan",
            },
        ],
    },
    result:null,
}

const completedResult:QuizSessionResult={
    score:5,
    totalQuestions:5,
    answeredAttempts:6,
    reward:{
        xp:50,
        coins:25,
    },
    knowledgeStreak:{
        previous:3,
        current:4,
        longest:7,
        advanced:true,
    },
}

const completedSession:QuizSession={
    ...activeSession,
    status:"COMPLETED",
    completedAt:"2026-07-20T08:12:00.000Z",
    currentQuestion:null,
    progress:{
        correct:5,
        answeredAttempts:6,
        initialQuestions:5,
        remainingQueue:0,
    },
    result:completedResult,
}

function renderQuestionPage(){
    return render(
        <MemoryRouter initialEntries={["/quiz/session/session-123"]}>
            <Routes>
                <Route
                    path="/quiz/session/:sessionId"
                    element={<QuizQuestionPage/>}
                />
                <Route
                    path="/quiz/session/:sessionId/results"
                    element={<QuizResultsPage/>}
                />
                <Route
                    path="/quests"
                    element={<div>Quests page</div>}
                />
            </Routes>
        </MemoryRouter>,
    )
}

function renderTopicPage(path:string){
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route
                    path="/quiz/topics/:topic"
                    element={<TopicQuizTeachingPage/>}
                />
                <Route
                    path="/quiz/topics"
                    element={<div>Topics page</div>}
                />
            </Routes>
        </MemoryRouter>,
    )
}

describe("quiz non-happy-path states",()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
    })
    it("resumes an existing session after the question page loads",async()=>{
        mockedGetQuizSession.mockResolvedValue(activeSession)
        renderQuestionPage()
        expect(await screen.findByText("What is a budget?"),).toBeInTheDocument()
        expect(mockedGetQuizSession).toHaveBeenCalledWith(
            "session-123",
            expect.objectContaining({signal:expect.any(AbortSignal),}),
        )
    })
    it("handles an already-completed session without allowing another answer",async()=>{
        mockedGetQuizSession.mockResolvedValue(completedSession)
        renderQuestionPage()
        expect(await screen.findByText("This quiz has already been completed.",),).toBeInTheDocument()
        expect(screen.getByRole("button",{name:"View Results",}),).toBeInTheDocument()
        expect(screen.queryByText("Choose the best answer"),).not.toBeInTheDocument()
    })
    it("shows a retry action when loading the session fails",async()=>{
        const user=userEvent.setup()
        mockedGetQuizSession
            .mockRejectedValueOnce(new Error("Failed to load quiz session"))
            .mockResolvedValueOnce(activeSession)
        renderQuestionPage()
        expect(await screen.findByText("Failed to load quiz session"),).toBeInTheDocument()
        await user.click(
            screen.getByRole("button",{name:"Retry",}),
        )
        expect(await screen.findByText("What is a budget?"),).toBeInTheDocument()
        expect(mockedGetQuizSession).toHaveBeenCalledTimes(2)
    })
    it("handles an invalid or expired session gracefully",async()=>{
        mockedGetQuizSession.mockRejectedValue(
            new Error("Quiz session not found"),
        )
        renderQuestionPage()
        expect(await screen.findByText("Quiz session not found"),).toBeInTheDocument()
        expect(screen.getByRole("button",{name:"Retry",}),).toBeInTheDocument()
    })
    it("handles an invalid topic route gracefully",async()=>{
        renderTopicPage("/quiz/topics/NOT_A_TOPIC")
        expect(screen.getByText("We couldn't find that quiz topic."),).toBeInTheDocument()
        expect(screen.getByRole("button",{name:"Back to topics",}),).toBeInTheDocument()
        expect(mockedGetQuizTopic).not.toHaveBeenCalled()
    })
})