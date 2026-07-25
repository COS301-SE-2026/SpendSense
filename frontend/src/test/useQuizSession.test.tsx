import {describe,it,expect,vi,beforeEach} from 'vitest'
import {renderHook,act} from '@testing-library/react'

vi.mock('../features/quiz/quizApi')

import * as quizApi from '../features/quiz/quizApi'
import {useQuizSession} from '../hooks/useQuizSession'
import type {QuizSession,SubmitQuizAnswerResponse} from '../features/quiz/quizTypes'

const mockedCreate=vi.mocked(quizApi.createQuizSession)
const mockedGetSession=vi.mocked(quizApi.getQuizSession)
const mockedSubmit=vi.mocked(quizApi.submitQuizAnswer)

function deferred<T>(){
    let resolve!:(value:T)=>void
    let reject!:(reason?:unknown)=>void
    const promise=new Promise<T>((res,rej)=>{
        resolve=res
        reject=rej
    })
    return {promise,resolve,reject}
}

function makeSession(overrides:Partial<QuizSession>={}):QuizSession{
    return {
        id:'session_A',
        type:'DAILY',
        topic:null,
        status:'IN_PROGRESS',
        startedAt:'2026-07-14T00:00:00.000Z',
        completedAt:null,
        progress:{correct:0,answeredAttempts:0,initialQuestions:5,remainingQueue:5},
        currentQuestion:{
            id:'question_1',
            number:1,
            topic:'CREDIT_SCORE',
            prompt:'Prompt?',
            options:[{key:'A',text:'Yes'},{key:'B',text:'No'}],
        },
        result:null,
        ...overrides,
    }
}

function makeAnswerResponse(
    overrides:Partial<SubmitQuizAnswerResponse>={},
):SubmitQuizAnswerResponse{
    return {
        sessionId:'session_A',
        status:'IN_PROGRESS',
        feedback:{isCorrect:true,explanation:'Correct.',requeued:false},
        progress:{correct:1,answeredAttempts:1,initialQuestions:5,remainingQueue:4},
        nextQuestion:{
            id:'question_2',
            number:2,
            topic:'CREDIT_SCORE',
            prompt:'Next?',
            options:[{key:'A',text:'Yes'},{key:'B',text:'No'}],
        },
        result:null,
        ...overrides,
    }
}

beforeEach(()=>{
    mockedCreate.mockReset()
    mockedGetSession.mockReset()
    mockedSubmit.mockReset()
})

describe('initial state',()=>{
    it('starts with no session and nothing loading',()=>{
        const {result}=renderHook(()=>useQuizSession())
        expect(result.current.session).toBeNull()
        expect(result.current.currentQuestion).toBeNull()
        expect(result.current.feedback).toBeNull()
        expect(result.current.result).toBeNull()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isSubmitting).toBe(false)
        expect(result.current.error).toBeNull()
    })
})

describe('starting a session',()=>{
    it('startDailyQuiz calls createQuizSession with type DAILY and stores the session',async()=>{
        const session=makeSession()
        mockedCreate.mockResolvedValue(session)
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        expect(mockedCreate).toHaveBeenCalledWith({type:'DAILY'},expect.objectContaining({signal:expect.any(AbortSignal)}))
        expect(result.current.session).toEqual(session)
        expect(result.current.currentQuestion).toEqual(session.currentQuestion)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
    })
    it('startTopicQuiz calls createQuizSession with type TOPIC and the topic',async()=>{
        mockedCreate.mockResolvedValue(makeSession({type:'TOPIC',topic:'CREDIT_SCORE'}))
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startTopicQuiz('CREDIT_SCORE')
        })
        expect(mockedCreate).toHaveBeenCalledWith(
            {type:'TOPIC',topic:'CREDIT_SCORE'},
            expect.anything(),
        )
    })
    it('sets isLoading true while the request is in flight, then false',async()=>{
        const {promise,resolve}=deferred<QuizSession>()
        mockedCreate.mockReturnValue(promise)
        const {result}=renderHook(()=>useQuizSession())
        let startPromise!:Promise<QuizSession|null>
        act(()=>{
            startPromise=result.current.startDailyQuiz()
        })
        expect(result.current.isLoading).toBe(true)
        await act(async()=>{
            resolve(makeSession())
            await startPromise
        })
        expect(result.current.isLoading).toBe(false)
    })
    it('populates result from session.result when resuming a completed session',async()=>{
        const completed=makeSession({
            status:'COMPLETED',
            currentQuestion:null,
            result:{
                score:5,
                totalQuestions:5,
                answeredAttempts:5,
                reward:{xp:50,coins:25},
                knowledgeStreak:{previous:3,current:4,longest:7,advanced:true},
            },
        })
        mockedCreate.mockResolvedValue(completed)
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        expect(result.current.result).toEqual(completed.result)
    })

    it('sets error and leaves session untouched when createQuizSession rejects',async()=>{
        mockedCreate.mockRejectedValue(new Error('quiz already completed today'))
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        expect(result.current.error).toBe('quiz already completed today')
        expect(result.current.session).toBeNull()
        expect(result.current.isLoading).toBe(false)
    })
    it('does not set error for an aborted request',async()=>{
        const abortError=new DOMException('aborted','AbortError')
        mockedCreate.mockRejectedValue(abortError)
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        expect(result.current.error).toBeNull()
    })
    it('a second startDailyQuiz call supersedes the first — the first resolving late is ignored',async()=>{
        const first=deferred<QuizSession>()
        const secondSession=makeSession({id:'session_B'})
        mockedCreate.mockReturnValueOnce(first.promise).mockResolvedValueOnce(secondSession)
        const {result}=renderHook(()=>useQuizSession())
        act(()=>{
            result.current.startDailyQuiz() //first call, left pending
        })
        await act(async()=>{
            await result.current.startDailyQuiz() //second call resolves immediately
        })
        //Now resolve the stale first call — it must not clobber session B.
        await act(async()=>{
            first.resolve(makeSession({id:'session_STALE'}))
        })
        expect(result.current.session?.id).toBe('session_B')
    })
})

describe('resuming a session',()=>{
    it('resumeSession calls getQuizSession with the id and stores the result',async()=>{
        const session=makeSession({id:'session_resume'})
        mockedGetSession.mockResolvedValue(session)
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.resumeSession('session_resume')
        })
        expect(mockedGetSession).toHaveBeenCalledWith('session_resume',expect.anything())
        expect(result.current.session).toEqual(session)
    })

    it('clears a stale result from a previous session when resuming a new one',async()=>{
        const completed=makeSession({
            id:'session_old',
            status:'COMPLETED',
            result:{
                score:5,totalQuestions:5,answeredAttempts:5,
                reward:{xp:50,coins:25},
                knowledgeStreak:{previous:3,current:4,longest:7,advanced:true},
            },
        })
        mockedCreate.mockResolvedValue(completed)
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        expect(result.current.result).not.toBeNull()
        const fresh=makeSession({id:'session_new',result:null})
        mockedGetSession.mockResolvedValue(fresh)
        await act(async()=>{
            await result.current.resumeSession('session_new')
        })
        expect(result.current.result).toBeNull()
    })

    it('sets error when getQuizSession rejects (e.g. session not found)',async()=>{
        mockedGetSession.mockRejectedValue(new Error('not found'))
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.resumeSession('missing_session')
        })
        expect(result.current.error).toBe('not found')
        expect(result.current.session).toBeNull()
    })
})

describe('answering a question',()=>{
    it('does nothing if there is no active session',async()=>{
        const {result}=renderHook(()=>useQuizSession())
        let response:SubmitQuizAnswerResponse|null=null
        await act(async()=>{
            response=await result.current.answerQuestion({questionId:'q1',selectedOptionKey:'A'})
        })
        expect(response).toBeNull()
        expect(mockedSubmit).not.toHaveBeenCalled()
    })
    it('submits the answer for the current session and applies a correct/continuing response',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        const response=makeAnswerResponse()
        mockedSubmit.mockResolvedValue(response)
        await act(async()=>{
            await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(mockedSubmit).toHaveBeenCalledWith(
            'session_A',
            {questionId:'question_1',selectedOptionKey:'A'},
            expect.anything(),
        )
        expect(result.current.feedback).toEqual(response.feedback)
        expect(result.current.nextQuestion).toEqual(response.nextQuestion)
        expect(result.current.session?.progress).toEqual(response.progress)
        expect(result.current.session?.status).toBe('IN_PROGRESS')
        expect(result.current.result).toBeNull()
    })
    it('applies requeue feedback for an incorrect answer without setting a result',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        mockedSubmit.mockResolvedValue(
            makeAnswerResponse({
                feedback:{isCorrect:false,explanation:'Not quite.',requeued:true},
            }),
        )
        await act(async()=>{
            await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'B'})
        })
        expect(result.current.feedback?.isCorrect).toBe(false)
        expect(result.current.feedback?.requeued).toBe(true)
        expect(result.current.result).toBeNull()
    })
    it('sets status COMPLETED and populates result on the final answer',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        const finalResult={
            score:5,totalQuestions:5,answeredAttempts:7,
            reward:{xp:50,coins:25},
            knowledgeStreak:{previous:3,current:4,longest:7,advanced:true},
        }
        mockedSubmit.mockResolvedValue(
            makeAnswerResponse({status:'COMPLETED',nextQuestion:null,result:finalResult}),
        )
        await act(async()=>{
            await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(result.current.session?.status).toBe('COMPLETED')
        expect(result.current.result).toEqual(finalResult)
        expect(result.current.nextQuestion).toBeNull()
    })
    it('guards against duplicate submission — a second call while one is in flight is a no-op',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        const first=deferred<SubmitQuizAnswerResponse>()
        mockedSubmit.mockReturnValue(first.promise)
        let secondResult:SubmitQuizAnswerResponse|null='unset' as unknown as null
        act(()=>{
            result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'}) //in flight
        })
        await act(async()=>{
            secondResult=await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'B'})
        })
        expect(secondResult).toBeNull()
        expect(mockedSubmit).toHaveBeenCalledTimes(1)
        await act(async()=>{
            first.resolve(makeAnswerResponse())
        })
    })
    it('sets isSubmitting true while in flight and false once settled',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        const {promise,resolve}=deferred<SubmitQuizAnswerResponse>()
        mockedSubmit.mockReturnValue(promise)
        let answerPromise!:Promise<SubmitQuizAnswerResponse|null>
        act(()=>{
            answerPromise=result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(result.current.isSubmitting).toBe(true)
        await act(async()=>{
            resolve(makeAnswerResponse())
            await answerPromise
        })
        expect(result.current.isSubmitting).toBe(false)
    })
    it('sets error and resets isSubmitting when submitQuizAnswer rejects',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        mockedSubmit.mockRejectedValue(new Error('network error'))
        await act(async()=>{
            await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(result.current.error).toBe('network error')
        expect(result.current.isSubmitting).toBe(false)
    })
    it('does not apply a stale answer response after a new session has started',async()=>{
        //Load session A.
        mockedCreate.mockResolvedValueOnce(makeSession({id:'session_A'}))
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        //Fire an answer for session A, but never let it resolve yet.
        const staleAnswer=deferred<SubmitQuizAnswerResponse>()
        mockedSubmit.mockReturnValue(staleAnswer.promise)
        act(()=>{
            result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(result.current.isSubmitting).toBe(true)
        //Before it resolves, start a brand-new session B.
        mockedCreate.mockResolvedValueOnce(makeSession({id:'session_B'}))
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        expect(result.current.session?.id).toBe('session_B')
        //Now let session A's stale answer resolve. It must not overwrite
        //session B's state, whether via the abort or the sessionId guard.
        await act(async()=>{
            staleAnswer.resolve(
                makeAnswerResponse({sessionId:'session_A',progress:{correct:99,answeredAttempts:99,initialQuestions:5,remainingQueue:0}}),
            )
        })
        expect(result.current.session?.id).toBe('session_B')
        expect(result.current.session?.progress.correct).not.toBe(99)
        expect(result.current.isSubmitting).toBe(false)
    })
    it('discards a response whose sessionId does not match the active session, even without a race',async()=>{
        mockedCreate.mockResolvedValue(makeSession({id:'session_A'}))
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        mockedSubmit.mockResolvedValue(makeAnswerResponse({sessionId:'session_UNRELATED'}))
        await act(async()=>{
            await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(result.current.feedback).toBeNull()
        expect(result.current.session?.id).toBe('session_A')
    })
})

describe('continueToNextQuestion',()=>{
    it('moves nextQuestion into session.currentQuestion and clears feedback/nextQuestion',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        mockedSubmit.mockResolvedValue(makeAnswerResponse())
        await act(async()=>{
            await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(result.current.nextQuestion?.id).toBe('question_2')
        act(()=>{
            result.current.continueToNextQuestion()
        })
        expect(result.current.currentQuestion?.id).toBe('question_2')
        expect(result.current.feedback).toBeNull()
        expect(result.current.nextQuestion).toBeNull()
    })
    it('is a no-op when there is no nextQuestion',()=>{
        const {result}=renderHook(()=>useQuizSession())
        act(()=>{
            result.current.continueToNextQuestion()
        })
        expect(result.current.session).toBeNull()
        expect(result.current.currentQuestion).toBeNull()
    })
})

describe('resetSession',()=>{
    it('clears all state back to initial values',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        expect(result.current.session).not.toBeNull()
        act(()=>{
            result.current.resetSession()
        })
        expect(result.current.session).toBeNull()
        expect(result.current.feedback).toBeNull()
        expect(result.current.nextQuestion).toBeNull()
        expect(result.current.result).toBeNull()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isSubmitting).toBe(false)
        expect(result.current.error).toBeNull()
    })
    it('unblocks answerQuestion for a subsequent session even if reset happened mid-submit',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        const stuck=deferred<SubmitQuizAnswerResponse>()
        mockedSubmit.mockReturnValue(stuck.promise)
        act(()=>{
            result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        act(()=>{
            result.current.resetSession()
        })
        expect(result.current.isSubmitting).toBe(false)
        mockedCreate.mockResolvedValue(makeSession({id:'session_fresh'}))
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        mockedSubmit.mockResolvedValue(makeAnswerResponse({sessionId:'session_fresh'}))
        await act(async()=>{
            await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(mockedSubmit).toHaveBeenLastCalledWith(
            'session_fresh',
            expect.anything(),
            expect.anything(),
        )
    })
})

describe('clearError',()=>{
    it('clears only the error, leaving other state intact',async()=>{
        mockedCreate.mockRejectedValue(new Error('boom'))
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        expect(result.current.error).toBe('boom')
        act(()=>{
            result.current.clearError()
        })
        expect(result.current.error).toBeNull()
    })
})

describe('cleanup',()=>{
    it('aborts in-flight requests when the hook unmounts',()=>{
        const abortSpy=vi.spyOn(AbortController.prototype,'abort')
        const pendingRequest=deferred<QuizSession>()
        mockedCreate.mockReturnValue(pendingRequest.promise)
        const {result,unmount}=renderHook(()=>useQuizSession())
        act(()=>{
            void result.current.startDailyQuiz()
        })
        unmount()
        expect(abortSpy).toHaveBeenCalled()
        abortSpy.mockRestore()
    })
    it('cancelRequests aborts both load and submit controllers',async()=>{
        mockedCreate.mockResolvedValue(makeSession())
        const {result}=renderHook(()=>useQuizSession())
        await act(async()=>{
            await result.current.startDailyQuiz()
        })
        const stuck=deferred<SubmitQuizAnswerResponse>()
        mockedSubmit.mockReturnValue(stuck.promise)
        act(()=>{
            result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(result.current.isSubmitting).toBe(true)

        act(()=>{
            result.current.cancelRequests()
        })
        expect(result.current.isSubmitting).toBe(true) //state itself isn't reset by cancelRequests alone
        //but the in-flight submittingRef guard is cleared, so a new answer can proceed:
        mockedSubmit.mockResolvedValue(makeAnswerResponse())
        let secondAnswer:SubmitQuizAnswerResponse|null=null
        await act(async()=>{
            secondAnswer=await result.current.answerQuestion({questionId:'question_1',selectedOptionKey:'A'})
        })
        expect(secondAnswer).not.toBeNull()
    })
})