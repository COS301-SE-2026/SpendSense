import React from "react"
import {describe,expect,it} from "vitest"
import {render,screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {MemoryRouter,Route,Routes} from "react-router-dom"
import QuizAnswerFeedbackPage from "../domains/QuizAnswerFeedbackPage"
import type {QuizAnswerFeedback,QuizQuestion,QuizSessionResult} from "../features/quiz/quizTypes"

const correctFeedback:QuizAnswerFeedback={
    isCorrect:true,
    explanation:"Paying obligations on time demonstrates reliable behaviour.",
    requeued:false,
}

const incorrectFeedback:QuizAnswerFeedback={
    isCorrect:false,
    explanation:"Missing payments damages your credit score over time.",
    requeued:true,
}

const nextQuestion:QuizQuestion={
    id:"question-2",
    topic:"BUDGETING",
    prompt:"What is a budget?",
    options:[
        {key:"A",text:"A plan for income and expenses",},
        {key:"B",text:"A type of loan",},
    ],
}

const finishedResult:QuizSessionResult={
    score:4,
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
}

function renderPage(state:unknown){
    return render(
        <MemoryRouter
            initialEntries={[
                {pathname:"/quiz/sessions/session-1/feedback",state,},
            ]}
        >
            <Routes>
                <Route
                    path="/quiz/sessions/:sessionId/feedback"
                    element={<QuizAnswerFeedbackPage/>}
                />

                <Route
                    path="/quiz/sessions/:sessionId"
                    element={<div>Question screen</div>}
                />

                <Route
                    path="/quiz/sessions/:sessionId/results"
                    element={<div>Results screen</div>}
                />

                <Route
                    path="/quests"
                    element={<div>Quests screen</div>}
                />
            </Routes>
        </MemoryRouter>
    )
}
describe("QuizAnswerFeedbackPage",()=>{
    it("shows a correct visual treatment and the backend explanation",()=>{
        renderPage({
            feedback:correctFeedback,
            nextQuestion,
            result:null,
        })
        expect(screen.getByText("Correct!")).toBeInTheDocument()
        expect(screen.getByText(correctFeedback.explanation)).toBeInTheDocument()
    })
    it("shows an incorrect visual treatment and the backend explanation",()=>{
        renderPage({
            feedback:incorrectFeedback,
            nextQuestion,
            result:null,
        })
        expect(screen.getByText("Not quite")).toBeInTheDocument()
        expect(screen.getByText(incorrectFeedback.explanation)).toBeInTheDocument()
    })
    it("shows the requeue note only when the answer was wrong and requeued",()=>{
        renderPage({
            feedback:incorrectFeedback,
            nextQuestion,
            result:null,
        })
        expect(screen.getByText(/will come back later in the quiz/i)).toBeInTheDocument()
    })
    it("does not show the requeue note for a correct answer",()=>{
        renderPage({
            feedback:correctFeedback,
            nextQuestion,
            result:null,
        })
        expect(screen.queryByText(/will come back later in the quiz/i)).not.toBeInTheDocument()
    })
    it("does not show any reward or settlement UI mid-quiz",()=>{
        renderPage({
            feedback:correctFeedback,
            nextQuestion,
            result:null,
        })
        expect(screen.queryByText(/quiz complete/i)).not.toBeInTheDocument()
    })
    it("shows the result summary only once the session has finished",()=>{
        renderPage({
            feedback:correctFeedback,
            nextQuestion:null,
            result:finishedResult,
        })
        expect(
            screen.getByText("Quiz complete — 4 of 5 correct")
        ).toBeInTheDocument()
    })
    it("advances to the next question on continue when the session is still in progress",async()=>{
        const user=userEvent.setup()
        renderPage({
            feedback:correctFeedback,
            nextQuestion,
            result:null,
        })
        await user.click(screen.getByRole("button",{name:"Next Question",}))
        expect(await screen.findByText("Question screen")).toBeInTheDocument()
    })
    it("goes to the results screen on continue when the session has finished",async()=>{
        const user=userEvent.setup()
        renderPage({
            feedback:correctFeedback,
            nextQuestion:null,
            result:finishedResult,
        })
        await user.click(screen.getByRole("button",{name:"View Results",}))
        expect(await screen.findByText("Results screen")).toBeInTheDocument()
    })

    it("exits the quiz back to quests",async()=>{
        const user=userEvent.setup()
        renderPage({
            feedback:correctFeedback,
            nextQuestion,
            result:null,
        })
        await user.click(screen.getByRole("link",{name:"Exit quiz",}))
        expect(await screen.findByText("Quests screen")).toBeInTheDocument()
    })
    it("redirects back to the question screen when there is no feedback in history state",async()=>{
        renderPage(undefined)
        expect(await screen.findByText("Question screen")).toBeInTheDocument()
    })
    it("redirects back to the question screen when history state is malformed",async()=>{
        renderPage({unrelated:"value"})
        expect(await screen.findByText("Question screen")).toBeInTheDocument()
    })
    it("shows an unavailable message when there is no session id in the url",()=>{
        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname:"/quiz/feedback",
                        state:{
                            feedback:correctFeedback,
                            nextQuestion,
                            result:null,
                        },
                    },
                ]}
            >
                <Routes>
                    <Route
                        path="/quiz/feedback"
                        element={<QuizAnswerFeedbackPage/>}
                    />
                </Routes>
            </MemoryRouter>
        )
        expect(screen.getByText("Quiz unavailable")).toBeInTheDocument()
        expect(screen.getByText("This quiz session is invalid.")).toBeInTheDocument()
    })
})