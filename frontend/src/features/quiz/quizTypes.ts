//The correct option is never present on QuizQuestion - it is sent by the backend untiil after an answer is submitte, client must never bmake up or store one locally.
export type QuizTopic='BUDGETING'|'CREDIT_SCORE'|'INTEREST'|'DEBT'|'BNPL'|'SUBSCRIPTIONS'

export type QuizSessionType='DAILY'|'TOPIC'

export type QuizSessionStatus='IN_PROGRESS'|'COMPLETED'|'ABANDONED'

//shared API res
export interface ApiSuccessResponese<T>{
    data:T
}

export interface ApiErrorResponse{
    statusCode:number
    message:string
    timestamp:string
    path:string
}

//question response
export interface QuizOption{
    key:string
    text:string
}

export interface QuizQuestion{
    id:string
    topic:QuizTopic
    prompt:string
    options:QuizOption[]
}

//session summary
export interface QuizProgress{
    correct:number
    answeredAttempts:number
    initialQuestions:number
    remainingQueue:number
}

//GET /api/v1/quiz/daily
export type DailyQuizStatus='AVAILABLE'|'IN_PROGRESS'|'COMPLETED'


export interface QuizReward{
    xp:number
    coins:number
}

export interface QuizRewardpReview{
    xp:number
    coins:number
}

export interface QuizKnowledgeStreak{
    current:number
    longest:number
}

export interface DailyQuizAvailable{
    date:string
    status:'AVAILABLE'
    session:null
    rewardPreview:QuizRewardpReview
    knowledgeStreak:QuizKnowledgeStreak
}

export interface DailyQuizInProgress{
    date:string
    status:'IN_PROGRESS'
    session:{
        id:string
        type:'DAILY'
        status:'IN_PROGRESS'
        progress:QuizProgress
    }
    rewardPreview:QuizRewardpReview
}

export interface DailyQuizCompleted{
    date:string
    status:'COMPLETED'
    session:{
        id:string
        type:'DAILY'
        status:'COMPLETED'
        score:number
        totalQuestions:number
        completedAt:string|null
    }
    reward:QuizReward
}

export type DailyQuizState=DailyQuizAvailable|DailyQuizInProgress|DailyQuizCompleted

// GET /api/v1/quiz/topics
export interface QuizTopicSummary{
    key:QuizTopic
    name:string
    description:string
    available:boolean
    questionCount:number
    rewardPreview:QuizRewardpReview|null
}

// GET /api/v1/quiz/topics/:topic
export interface TopicQuizTeachingContent{
    title:string
    body:string
    keyPoints:string[]
}

export interface QuizTopicDetail{
    key:QuizTopic
    name:string
    description:string
    teachingContent:TopicQuizTeachingContent
    available:boolean
    questionCount:number
}



// POST /api/v1/quiz/sessions
export type CreateQuizSessionRequest={type:'DAILY'}|{type:'TOPIC';topic:QuizTopic}

export interface QuizSession{
    id:string
    type:QuizSessionType
    topic:QuizTopic|null
    status:QuizSessionStatus
    startedAt:string
    completedAt:string|null
    progress:QuizProgress
    currentQuestion:QuizQuestion|null
    rewardPreview?:QuizRewardpReview
    result?:QuizSessionResult|null
}

// GET /api/v1/quiz/sessions/:id
export interface QuizKnowledgeStreakUpdate{
    previous:number
    current:number
    longest:number
    advanced:boolean
}
export interface QuizSessionResult{
    score:number
    totalQuestions:number
    answeredAttempts:number
    reward:QuizReward
    knowledgeStreak:QuizKnowledgeStreakUpdate
}

// POST /api/v1/quiz/sessions/:id/answer
export interface SubmitQuizAnswerRequest{
    questionId:string
    selectedOptionKey:string
}

export interface QuizAnswerFeedback{
    isCorrect:boolean
    explanation:string
    requeued:boolean
}

export interface SubmitQuizAnswerResponse{
    sessionId:string
    status:QuizSessionStatus
    feedback:QuizAnswerFeedback
    progress:QuizProgress
    nextQuestion:QuizQuestion|null
    result:QuizSessionResult|null
}
