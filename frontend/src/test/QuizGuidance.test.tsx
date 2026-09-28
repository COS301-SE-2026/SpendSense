import React from 'react'
import {act,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import QuizAnswerFeedbackPage from '../domains/QuizAnswerFeedbackPage'
import QuizQuestionPage from '../domains/QuizQuestionPage'
import QuizResultsPage from '../domains/QuizResultsPage'
import {GuidanceProvider} from '../features/guidance/GuidanceProvider'
import type {
    QuizAnswerFeedback,
    QuizQuestion,
    QuizSession,
    QuizSessionResult,
    SubmitQuizAnswerResponse,
} from '../features/quiz/quizTypes'
import {createFakeGuidanceApi} from './guidanceTestUtils'

vi.mock('../hooks/useGamificationProfile',()=>({
    useGamificationProfile:()=>({
        profile:{mascotMood:'HAPPY',equippedCosmetics:[]},
        loading:false,
        error:null,
        refetch:vi.fn(),
    }),
}))

const quizSession=vi.hoisted(()=>({value:null as unknown}))
vi.mock('../hooks/useQuizSession',()=>({
    useQuizSession:()=>quizSession.value,
}))

function feedback(overrides:Partial<QuizAnswerFeedback>={}):QuizAnswerFeedback{
    return{
        isCorrect:true,
        explanation:'Compound interest grows the balance you have not paid off yet.',
        requeued:false,
        ...overrides,
    }
}

function renderFeedback(state:{feedback:QuizAnswerFeedback;nextQuestion:null;result:QuizSessionResult|null}){
    return render(
        <MemoryRouter initialEntries={[{pathname:'/quiz/session/s1/feedback',state}]}>
            <GuidanceProvider api={createFakeGuidanceApi()} userId="user-1">
                <Routes>
                    <Route path="/quiz/session/:sessionId/feedback" element={<QuizAnswerFeedbackPage/>}/>
                </Routes>
            </GuidanceProvider>
        </MemoryRouter>,
    )
}

function makeResult(overrides:Partial<QuizSessionResult>={}):QuizSessionResult{
    return{
        score:4,
        totalQuestions:5,
        answeredAttempts:5,
        reward:{xp:40,coins:12},
        knowledgeStreak:{previous:1,current:2,longest:3,advanced:true},
        ...overrides,
    }
}

function renderResults(session:Partial<QuizSession>){
    quizSession.value={
        session:{id:'s1',type:'DAILY',status:'COMPLETED',...session},
        result:makeResult(),
        isLoading:false,
        error:null,
        resumeSession:vi.fn(),
    }
    return render(
        <MemoryRouter initialEntries={['/quiz/session/s1/results']}>
            <GuidanceProvider api={createFakeGuidanceApi()} userId="user-1">
                <Routes>
                    <Route path="/quiz/session/:sessionId/results" element={<QuizResultsPage/>}/>
                </Routes>
            </GuidanceProvider>
        </MemoryRouter>,
    )
}

const question:QuizQuestion={
    id:'question-1',
    number:2,
    topic:'CREDIT_SCORE',
    prompt:'Which action is most likely to improve your credit score?',
    options:[
        {key:'A',text:'Paying obligations on time'},
        {key:'B',text:'Missing every payment'},
    ],
}

function renderQuestionPage(isCorrect:boolean){
    const continueToNextQuestion=vi.fn()
    const answer:SubmitQuizAnswerResponse={
        sessionId:'s1',
        status:'IN_PROGRESS',
        feedback:{isCorrect,explanation:'Paying on time shows reliable behaviour.',requeued:false},
        progress:{correct:1,answeredAttempts:1,initialQuestions:5,remainingQueue:4},
        nextQuestion:null,
        result:null,
    }
    quizSession.value={
        session:{
            id:'s1',
            type:'DAILY',
            topic:null,
            status:'IN_PROGRESS',
            startedAt:'2026-09-10T08:00:00.000Z',
            completedAt:null,
            progress:{correct:0,answeredAttempts:0,initialQuestions:5,remainingQueue:5},
            currentQuestion:question,
            rewardPreview:{xp:50,coins:10},
            result:null,
        },
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
        resumeSession:vi.fn(),
        answerQuestion:vi.fn(async()=>answer),
        continueToNextQuestion,
        clearError:vi.fn(),
        resetSession:vi.fn(),
        cancelRequests:vi.fn(),
    }
    render(
        <MemoryRouter initialEntries={['/quiz/session/s1']}>
            <GuidanceProvider api={createFakeGuidanceApi()} userId="user-1">
                <Routes>
                    <Route path="/quiz/session/:sessionId" element={<QuizQuestionPage/>}/>
                </Routes>
            </GuidanceProvider>
        </MemoryRouter>,
    )
    return {continueToNextQuestion}
}

describe('quiz guidance',()=>{
    it('stays quiet until an answer is submitted, then leans in from the side',async()=>{
        const user=userEvent.setup()
        renderQuestionPage(true)

        expect(screen.queryByRole('img',{name:/Mascot/})).toBeNull()

        await user.click(screen.getByRole('button',{name:/Paying obligations on time/}))
        await user.click(screen.getByRole('button',{name:/submit/i}))

        const card=await screen.findByTestId('guide-card')
        expect(card).toHaveAttribute('data-guide-id','quiz.feedback.correct')
        expect(card).toHaveAttribute('data-guide-variant','bubble')
        expect(screen.queryByRole('button',{name:'Next question'})).toBeNull()
        expect(card).toHaveTextContent('Paying on time shows reliable behaviour.')
        expect(screen.getAllByText(/Paying on time shows reliable behaviour/)).toHaveLength(1)
        expect(screen.getByRole('img',{name:/Mascot/})).toBeInTheDocument()
    })

    it('explains a wrong answer in the quiz itself and waits to be dismissed',async()=>{
        vi.useFakeTimers({shouldAdvanceTime:true})
        const user=userEvent.setup({advanceTimers:vi.advanceTimersByTime})
        try{
            const {continueToNextQuestion}=renderQuestionPage(false)

            await user.click(screen.getByRole('button',{name:/Paying obligations on time/}))
            await user.click(screen.getByRole('button',{name:/submit/i}))

            const card=await screen.findByTestId('guide-card')
            expect(card).toHaveAttribute('data-guide-id','quiz.feedback.incorrect')
            expect(card).toHaveTextContent('Paying on time shows reliable behaviour.')

            await act(async()=>{
                vi.advanceTimersByTime(30000)
            })
            expect(await screen.findByTestId('guide-card')).toBeInTheDocument()
            expect(continueToNextQuestion).not.toHaveBeenCalled()

            await user.click(screen.getByRole('button',{name:'Next question'}))
            expect(continueToNextQuestion).toHaveBeenCalledTimes(1)
        }finally{
            vi.useRealTimers()
        }
    })

    it('leaves the standalone feedback route to its own explanation',async()=>{
        renderFeedback({feedback:feedback(),nextQuestion:null,result:null})

        expect(screen.getByText(/Compound interest grows the balance/)).toBeInTheDocument()
    })

    it('leaves the standalone feedback route alone for a wrong answer too',async()=>{
        renderFeedback({
            feedback:feedback({isCorrect:false}),
            nextQuestion:null,
            result:null,
        })

        expect(screen.getByText(/Compound interest grows the balance/)).toBeInTheDocument()
    })

    it('leaves the standalone feedback route alone for a requeued question',async()=>{
        renderFeedback({
            feedback:feedback({isCorrect:false,requeued:true}),
            nextQuestion:null,
            result:null,
        })

        expect(screen.getByText(/Compound interest grows the balance/)).toBeInTheDocument()
        expect(screen.getByText(/This question will come back later in the quiz/)).toBeInTheDocument()
    })

    it('celebrates a finished daily quiz with the rewards the server returned',async()=>{
        renderResults({type:'DAILY'})

        const card=await screen.findByRole('status')
        expect(card).toHaveAttribute('data-guide-id','quiz.session.completed')
        expect(card).toHaveAttribute('data-guide-variant','bubble')
        expect(card).toHaveTextContent('12 coins')
        expect(card).toHaveTextContent('40 XP')
    })

    it('does not pass a finished topic quiz off as the daily one',async()=>{
        renderResults({type:'TOPIC',topic:'BUDGETING'})

        const card=await screen.findByRole('status')
        expect(card).toHaveAttribute('data-guide-id','quiz.topic.completed')
        expect(card).toHaveAttribute('data-guide-variant','bubble')
        await waitFor(()=>expect(card).toHaveTextContent(/does not count as today/))
    })
})