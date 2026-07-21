import React from "react"
import {beforeEach,describe,expect,it,vi} from "vitest"
import {fireEvent,render,screen,waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {MemoryRouter,Route,Routes} from "react-router-dom"
import QuizQuestionPage from "../domains/QuizQuestionPage"
import {useQuizSession} from "../hooks/useQuizSession"
import type {QuizQuestion,QuizSession,SubmitQuizAnswerResponse,} from "../features/quiz/quizTypes"

vi.mock("@/hooks/useQuizSession",()=>({
    useQuizSession:vi.fn(),
}))

const mockedUseQuizSession=vi.mocked(useQuizSession)

const question:QuizQuestion={
    id:"question-1",
    topic:"CREDIT_SCORE",
    prompt:"Which action is most likely to improve your credit score?",
    options:[
        {key:"A",text:"Paying obligations on time",},
        {key:"B",text:"Missing every payment",},
        {key:"C",text:"Ignoring all debt",},
        {key:"D",text:"Opening unnecessary accounts",},
    ],
}

const session:QuizSession={
    id:"session-1",
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
    currentQuestion:question,
    rewardPreview:{
        xp:50,
        coins:10,
    },
    result:null,
}

const answerResponse:SubmitQuizAnswerResponse={
    sessionId:"session-1",
    status:"IN_PROGRESS",
    feedback:{
        isCorrect:true,
        explanation:"Paying obligations on time demonstrates reliable behaviour.",
        requeued:false,
    },
    progress:{
        correct:2,
        answeredAttempts:2,
        initialQuestions:5,
        remainingQueue:3,
    },
    nextQuestion:{
        id:"question-2",
        topic:"BUDGETING",
        prompt:"What is a budget?",
        options:[
            {key:"A",text:"A plan for income and expenses",},
            {key:"B",text:"A type of loan",},
        ],
    },
    result:null,
}

const resumeSession=vi.fn()
const answerQuestion=vi.fn()
const clearError=vi.fn()

function mockHook(
    overrides:Partial<ReturnType<typeof useQuizSession>>={}
){
    mockedUseQuizSession.mockReturnValue({
        session,
        currentQuestion:question,
        feedback:null,
        nextQuestion:null,
        result:null,
        isLoading:false,
        isSubmitting:false,
        error:null,
        startSession:vi.fn(),
        startDailyQuiz:vi.fn(),
        startTopicQuiz:vi.fn(),
        resumeSession,
        answerQuestion,
        continueToNextQuestion:vi.fn(),
        clearError,
        resetSession:vi.fn(),
        cancelRequests:vi.fn(),
        ...overrides,
    })
}

function renderPage(){
    return render(
        <MemoryRouter initialEntries={["/quiz/session/session-1"]}>
            <Routes>
                <Route
                    path="/quiz/session/:sessionId"
                    element={<QuizQuestionPage/>}
                />
                <Route
                    path="/quiz/session/:sessionId/feedback"
                    element={<div>Feedback screen</div>}
                />
                <Route
                    path="/quiz/session/:sessionId/results"
                    element={<div>Results screen</div>}
                />
                <Route
                    path="/quests"
                    element={<div>Quests screen</div>}
                />
            </Routes>
        </MemoryRouter>,
    )
}

describe("QuizQuestionPage",()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        resumeSession.mockResolvedValue(session)
        answerQuestion.mockResolvedValue(answerResponse)
        mockHook()
    })

    it("resumes the quiz session using the session id",async()=>{
        renderPage()
        await waitFor(()=>{
            expect(resumeSession).toHaveBeenCalledWith("session-1")
        })
    })
    it("renders the current question and answer options",()=>{
        renderPage()
        expect(screen.getByRole("heading",{name:"Which action is most likely to improve your credit score?",})).toBeInTheDocument()
        expect(screen.getByRole("button",{name:/paying obligations on time/i,})).toBeInTheDocument()
        expect(screen.getByRole("button",{name:/missing every payment/i,})).toBeInTheDocument()
        expect(screen.getByRole("button",{name:/ignoring all debt/i,})).toBeInTheDocument()
        expect(screen.getByRole("button",{name:/opening unnecessary accounts/i,})).toBeInTheDocument()    })
    it("shows the topic and progress from the backend session",()=>{
        renderPage()
        expect(screen.getByText("Credit Score")).toBeInTheDocument()
        expect(screen.getByText("Question 2 of 5")).toBeInTheDocument()
        expect(screen.getByText("1 correct")).toBeInTheDocument()
        const progressBar=screen.getByRole("progressbar")
        expect(progressBar).toHaveAttribute("aria-valuemin","0")
        expect(progressBar).toHaveAttribute("aria-valuemax","5")
        expect(progressBar).toHaveAttribute("aria-valuenow","1")
    })
    it("keeps the submit button disabled until an option is selected",async()=>{
        const user=userEvent.setup()
        renderPage()
        const submitButton=screen.getByRole("button",{name:"Submit Answer",})
        expect(submitButton).toBeDisabled()
        await user.click( screen.getByRole("button",{name:/paying obligations on time/i,}))
        expect(submitButton).toBeEnabled()
    })
    it("shows the selected visual state",async()=>{
        const user=userEvent.setup()
        renderPage()
        const option=screen.getByRole("button",{name:/paying obligations on time/i,})
        expect(option).toHaveAttribute("aria-pressed","false")
        await user.click(option)
        expect(option).toHaveAttribute("aria-pressed","true")
    })
    it("allows the user to change their selected answer before submitting",async()=>{
        const user=userEvent.setup()
        renderPage()
        const firstOption=screen.getByRole("button",{name:/paying obligations on time/i,})
        const secondOption=screen.getByRole("button",{name:/missing every payment/i,})
        await user.click(firstOption)
        await user.click(secondOption)
        expect(firstOption).toHaveAttribute("aria-pressed","false")
        expect(secondOption).toHaveAttribute("aria-pressed","true")
    })
    it("submits the backend question id and selected option key",async()=>{
        const user=userEvent.setup()
        renderPage()
        await user.click(screen.getByRole("button",{name:/paying obligations on time/i,}))
        await user.click(screen.getByRole("button",{name:"Submit Answer",}))
        await waitFor(()=>{
            expect(answerQuestion).toHaveBeenCalledTimes(1)
        })
        expect(answerQuestion).toHaveBeenCalledWith({
            questionId:"question-1",
            selectedOptionKey:"A",
        })
    })
    it("navigates to the feedback screen after a successful submission",async()=>{
        const user=userEvent.setup()
        renderPage()
        await user.click(
            screen.getByRole("button",{name:/paying obligations on time/i,})
        )
        await user.click(
            screen.getByRole("button",{name:"Submit Answer",})
        )
        expect(await screen.findByText("Feedback screen")).toBeInTheDocument()
    })
    it("does not navigate when answer submission fails",async()=>{
        const user=userEvent.setup()
        answerQuestion.mockResolvedValue(null)
        renderPage()
        await user.click(screen.getByRole("button",{name:/paying obligations on time/i, }))
        await user.click(screen.getByRole("button",{name:"Submit Answer",}))
        await waitFor(()=>{
            expect(answerQuestion).toHaveBeenCalledTimes(1)
        })
        expect(screen.queryByText("Feedback screen")).not.toBeInTheDocument()
        expect(screen.getByRole("button",{name:"Submit Answer",})).toBeEnabled()
    })
    it("prevents submitting the answer twice",async()=>{
        let resolveSubmission:((response:SubmitQuizAnswerResponse)=>void)|undefined
        answerQuestion.mockImplementation(()=>new Promise((resolve)=>{
            resolveSubmission=resolve
        }))
        const user=userEvent.setup()
        renderPage()
        await user.click(
            screen.getByRole("button",{name:/paying obligations on time/i,})
        )
        const submitButton=screen.getByRole("button",{name:"Submit Answer",})
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)
        expect(answerQuestion).toHaveBeenCalledTimes(1)
        resolveSubmission?.(answerResponse)
        expect(await screen.findByText("Feedback screen")).toBeInTheDocument()
    })
    it("disables answer options while an answer is submitting",()=>{
        mockHook({isSubmitting:true,})
        renderPage()
        expect(screen.getByRole("button",{name:/paying obligations on time/i,})).toBeDisabled()
        expect(screen.getByRole("button",{name:"Checking answer...",})).toBeDisabled()
    })
    it("renders the loading skeleton while the session loads",()=>{
        mockHook({
            session:null,
            currentQuestion:null,
            isLoading:true,
        })
        const {container}=renderPage()
        expect(container.querySelector(".animate-pulse")).toBeInTheDocument()
        expect(screen.queryByText(question.prompt)).not.toBeInTheDocument()
    })
    it("shows a load error and retries the session",async()=>{
        const user=userEvent.setup()
        mockHook({
            session:null,
            currentQuestion:null,
            error:"Failed to load quiz session.",
        })
        renderPage()
        expect(screen.getByText("Failed to load quiz session.")).toBeInTheDocument()
        await user.click(
            screen.getByRole("button",{name:/retry/i,})
        )
        expect(resumeSession).toHaveBeenCalledWith("session-1")
    })
    it("shows an inline error when submission fails after a session loaded",()=>{
        mockHook({error:"Failed to submit answer.",})
        renderPage()
        expect(screen.getByText("Failed to submit answer.")).toBeInTheDocument()
    })
    it("shows an error when the session has no current question",()=>{
        mockHook({currentQuestion:null,})
        renderPage()
        expect(screen.getByText("There is no question available for this session.")).toBeInTheDocument()
        expect(screen.getByRole("button",{name:"Reload Quiz",})).toBeInTheDocument()
    })
    it("redirects a completed session to its results screen",async()=>{
        const user=userEvent.setup()
        mockHook({
            session:{
                ...session,
                status:"COMPLETED",
                currentQuestion:null,
                result:{
                    score:5,
                    totalQuestions:5,
                    answeredAttempts:5,
                    reward:{
                        xp:50,
                        coins:10,
                    },
                    knowledgeStreak:{
                        previous:2,
                        current:3,
                        longest:3,
                        advanced:true,
                    },
                },
            },
            currentQuestion:null,
        })
        renderPage()
        expect(screen.getByText("This quiz has already been completed.")).toBeInTheDocument()
        await user.click(
            screen.getByRole("button",{name:"View Results",})
        )
        expect(screen.getByText("Results screen")).toBeInTheDocument()
    })
    it("returns to quests when the user exits the quiz",async()=>{
        const user=userEvent.setup()
        renderPage()
        await user.click(
            screen.getByRole("button",{name:"Exit quiz",})
        )
        expect(screen.getByText("Quests screen")).toBeInTheDocument()
    })
})