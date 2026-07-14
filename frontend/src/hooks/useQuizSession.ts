import {useState,useCallback,useEffect,useRef} from 'react'
import { createQuizSession,getQuizSession,submitQuizAnswer } from '@/features/quiz/quizApi'
import type { CreateQuizSessionRequest,QuizAnswerFeedback,QuizQuestion,QuizSession,QuizSessionResult,QuizTopic,SubmitQuizAnswerRequest,SubmitQuizAnswerResponse } from '@/features/quiz/quizTypes'

function getErrorMessage(error:unknown){
    if(error instanceof Error){
        return error.message
    }
    if(typeof error==='object' && error!==null && 'message' in error && typeof error.message==='string'){
        return error.message
    }
    return "Something went wrong loading the quiz"
}

function isAbortError(error:unknown){
    return error instanceof Error && error.name==='AbortError'
}

export function useQuizSession(){
    const [session, setSession]=useState<QuizSession|null>(null)
    const [feedback, setFeedback]=useState<QuizAnswerFeedback|null>(null)
    const [nextQuestion, setNextQuestion]=useState<QuizQuestion|null>(null)
    const [result, setResult]=useState<QuizSessionResult|null>(null)
    const [isLoading, setIsLoading]=useState(false)
    const [isSubmitting, setIsSubmitting]=useState(false)
    const [error, setError]=useState<string|null>(null)
    const loadController=useRef<AbortController|null>(null)
    const submitController=useRef<AbortController|null>(null)
    const loadRequestId=useRef(0)
    const submitRequestId=useRef(0)
    const submittingRef=useRef(false)
    const cancelRequests=useCallback(()=>{
        loadRequestId.current+=1
        submitRequestId.current+=1
        loadController.current?.abort()
        submitController.current?.abort()
        loadController.current=null
        submitController.current=null
        submittingRef.current=false
    }, [])
    useEffect(()=>{
        return()=>
        {
            cancelRequests()
        }
    }, [cancelRequests])
    const startSession=useCallback(async(
        request:CreateQuizSessionRequest
    ):Promise<QuizSession|null>=>{
        submitController.current?.abort()
        submitRequestId.current+=1
        submittingRef.current=false
        loadController.current?.abort()
        const controller=new AbortController()
        const requestId=loadRequestId.current+1
        loadController.current=controller
        loadRequestId.current=requestId
        setIsLoading(true)
        setError(null)
        setFeedback(null)
        setNextQuestion(null)
        setResult(null)
        try{
            const loadedSession=await createQuizSession(
                request,
                {signal:controller.signal}
            )
            if(requestId!==loadRequestId.current){
                return null
            }
            setSession(loadedSession)
            setResult(loadedSession.result??null)
            return loadedSession
        }
        catch(error){
            if(isAbortError(error)){
                return null
            }
            if(requestId===loadRequestId.current){
                setError(getErrorMessage(error))
            }
            return null
        }
        finally{
            if(requestId===loadRequestId.current){
                setIsLoading(false)
            }
        }
    }, [])
    const startDailyQuiz=useCallback(()=>{
        return startSession({type:'DAILY'})
    }, [startSession])
    const startTopicQuiz=useCallback((topic:QuizTopic)=>{
        return startSession({
            type:'TOPIC',
            topic
        })
    }, [startSession])
    const resumeSession=useCallback(async(
        sessionId:string
    ):Promise<QuizSession|null>=>{
        submitController.current?.abort()
        submitRequestId.current+=1
        submittingRef.current=false
        loadController.current?.abort()
        const controller=new AbortController()
        const requestId=loadRequestId.current+1
        loadController.current=controller
        loadRequestId.current=requestId
        setIsLoading(true)
        setError(null)
        setFeedback(null)
        setNextQuestion(null)
        try{
            const loadedSession=await getQuizSession(
                sessionId,
                {signal:controller.signal}
            )
            if(requestId!==loadRequestId.current){
                return null
            }
            setSession(loadedSession)
            setResult(loadedSession.result??null)
            return loadedSession
        }
        catch(error){
            if(isAbortError(error)){
                return null
            }
            if(requestId===loadRequestId.current){
                setError(getErrorMessage(error))
            }
            return null
        }
        finally{
            if(requestId===loadRequestId.current){
                setIsLoading(false)
            }
        }
    }, [])
    const answerQuestion=useCallback(async(
        answer:SubmitQuizAnswerRequest
    ):Promise<SubmitQuizAnswerResponse|null>=>{
        if(!session||submittingRef.current){
            return null
        }
        submittingRef.current=true
        submitController.current?.abort()
        const controller=new AbortController()
        const requestId=submitRequestId.current+1
        submitController.current=controller
        submitRequestId.current=requestId
        setIsSubmitting(true)
        setError(null)
        try{
            const res=await submitQuizAnswer(
                session.id,
                answer,
                {signal:controller.signal}
            )
            if(requestId!==submitRequestId.current){
                return null
            }
            if(res.sessionId!==session.id){
                return null
            }
            setSession(currentSession=>
            {
                if(!currentSession){
                    return currentSession
                }
                return {
                    ...currentSession,
                    status:res.status,
                    progress:res.progress,
                    result:res.result
                }
            })
            setFeedback(res.feedback)
            setNextQuestion(res.nextQuestion)
            setResult(res.result)
            return res
        }
        catch(error){
            if(isAbortError(error)){
                return null
            }
            if(requestId===submitRequestId.current){
                setError(getErrorMessage(error))
            }
            return null
        }
        finally{
            if(requestId===submitRequestId.current){
                submittingRef.current=false
                setIsSubmitting(false)
            }
        }
    }, [session])
    const continueToNextQuestion=useCallback(()=>{
        if(!nextQuestion){
            return
        }
        setSession(currentSession=>
        {
            if(!currentSession){
                return currentSession
            }
            return {
                ...currentSession,
                currentQuestion:nextQuestion
            }
        })
        setFeedback(null)
        setNextQuestion(null)
    }, [nextQuestion])
    const clearError=useCallback(()=>{
        setError(null)
    }, [])
    const resetSession=useCallback(()=>{
        cancelRequests()
        setSession(null)
        setFeedback(null)
        setNextQuestion(null)
        setResult(null)
        setIsLoading(false)
        setIsSubmitting(false)
        setError(null)
    }, [cancelRequests])
    return {
        session,
        currentQuestion:session?.currentQuestion??null,
        feedback,
        nextQuestion,
        result,
        isLoading,
        isSubmitting,
        error,
        startSession,
        startDailyQuiz,
        startTopicQuiz,
        resumeSession,
        answerQuestion,
        continueToNextQuestion,
        clearError,
        resetSession,
        cancelRequests
    }
}