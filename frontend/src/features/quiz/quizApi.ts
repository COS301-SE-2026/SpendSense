import {apiFetch} from '../../lib/api'
import type { CreateQuizSessionRequest,DailyQuizState,SubmitQuizAnswerResponse,QuizSession,QuizTopic,QuizTopicDetail,QuizTopicSummary,SubmitQuizAnswerRequest} from './quizTypes'

//quizApi: finacial literacy daily and topic quizes
//backend controlls the question order, corectness, requeueuing, session copletion, rewards & knowledge streak updates

//PLANED ENDPTS:
// GET /api/v1/quiz/daily
// GET /api/v1/quiz/topics
// GET /api/v1/quiz/topics/:topic
// POST /api/v1/quiz/sessions
// GET /api/v1/quiz/sessions/:id
// POST /api/v1/quiz/sessions/:id/answer

interface Container<T>{
    data:T
}

//options every call accepts so callers can calcel bad requests
interface RequestOptions{
    signal?:AbortSignal
}

// GET /api/v1/quiz/daily
export async function getDailyQuiz(options?:RequestOptions,):Promise<DailyQuizState>{
    const res=await apiFetch<Container<DailyQuizState>>(`/quiz/daily`,{
        method:'GET',
        signal:options?.signal,
    })
    return res.data
}

// GET /api/v1/quiz/topics
export async function getQuizTopics(options?:RequestOptions,):Promise<QuizTopicSummary[]>{
    const res=await apiFetch<Container<QuizTopicSummary[]>>(`/quiz/topics`,{
        method:'GET',
        signal:options?.signal,
    })
    return res.data
}

// GET /api/v1/quiz/topics/:topic
export async function getQuizTopic(topic:QuizTopic, options?:RequestOptions,):Promise<QuizTopicDetail>{
    const res=await apiFetch<Container<QuizTopicDetail>>(`/quiz/topics/${topic}`,{
        method:'GET',
        signal:options?.signal,
    })
    return res.data
}

// POST /api/v1/quiz/sessions
export async function createQuizSession(request:CreateQuizSessionRequest,options?:RequestOptions,):Promise<QuizSession>{
    const res=await apiFetch<Container<QuizSession>>(`/quiz/sessions`,{
        method:'POST',
        body:JSON.stringify(request),
        signal:options?.signal,
    })
    return res.data
}

// GET /api/v1/quiz/sessions/:id
export async function getQuizSession(sessionId:string,options?:RequestOptions,):Promise<QuizSession>{
    const res=await apiFetch<Container<QuizSession>>(`/quiz/sessions/${sessionId}`,{
        method:'GET',
        signal:options?.signal,
    })
    return res.data
}

// POST /api/v1/quiz/sessions/:id/answer
export async function submitQuizAnswer(sessionId:string,answer:SubmitQuizAnswerRequest,options?:RequestOptions,):Promise<SubmitQuizAnswerResponse>{
    const res=await apiFetch<Container<SubmitQuizAnswerResponse>>(`/quiz/sessions/${sessionId}/answer`,{
        method:'POST',
        body:JSON.stringify(answer),
        signal:options?.signal,
    })
    return res.data
}