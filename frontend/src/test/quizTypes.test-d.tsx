import { expectTypeOf } from 'vitest'
import type {ApiErrorResponse,QuizTopic,QuizSessionType,QuizSessionStatus,QuizOption,QuizQuestion,DailyQuizState,QuizTopicSummary,QuizTopicDetail,CreateQuizSessionRequest,QuizSession,SubmitQuizAnswerRequest,QuizAnswerFeedback,SubmitQuizAnswerResponse} from '../features/quiz/quizTypes'

const topics:QuizTopic[]=[
    'BUDGETING',
    'CREDIT_SCORE',
    'INTEREST',
    'DEBT',
    'BNPL',
    'SUBSCRIPTIONS',
]
expectTypeOf(topics).toEqualTypeOf<QuizTopic[]>()
expectTypeOf<QuizSessionType>().toEqualTypeOf<'DAILY'|'TOPIC'>()
expectTypeOf<QuizSessionStatus>().toEqualTypeOf<'IN_PROGRESS'|'COMPLETED'|'ABANDONED'>()

//testing question type
const question:QuizQuestion={
    id:'question_123',
    number:1,
    topic:'CREDIT_SCORE',
    prompt:'Which behaviour is most likely to improve a simulated credit-health score?',
    options:[
        {
            key:'A',
            text:'Paying obligations on time',
        },
        {
            key:'B',
            text:'Ignoring overdue payments',
        },
    ],
}

//@ts-expect-error ->correctOptionKey must never be assignable on QuizQuestion
question.correctOptionKey='A'

const option:QuizOption={
    key:'A',
    text:'Paying obligations on time',
}

expectTypeOf(option).toMatchTypeOf<{key:string;text:string}>()

//GET /api/v1/quiz/daily
const dailyAvailable:DailyQuizState={
    date:'2026-07-13',
    status:'AVAILABLE',
    session:null,
    rewardPreview:{
        xp:50,
        coins:25,
    },
    knowledgeStreak:{
        current:3,
        longest:7,
    },
}

//checks state of daily quis
const dailyInProgress:DailyQuizState={
    date:'2026-07-13',
    status:'IN_PROGRESS',
    session:{
        id:'session_123',
        type:'DAILY',
        status:'IN_PROGRESS',
        progress:{
            correct:2,
            answeredAttempts:3,
            initialQuestions:5,
            remainingQueue:4,
        },
    },
    rewardPreview:{
        xp:50,
        coins:25,
    },
}

const dailyCompleted:DailyQuizState={
    date:'2026-07-13',
    status:'COMPLETED',
    session:{
        id:'session_123',
        type:'DAILY',
        status:'COMPLETED',
        score:5,
        totalQuestions:5,
        completedAt:'2026-07-13T08:12:00.000Z',
    },
    reward:{
        xp:50,
        coins:25,
    },
}

//daily quiz not yet started
const badDaily:DailyQuizState={
    date:'2026-07-13',
    status:'AVAILABLE',
	//@ts-expect-error->AVAILABLE requires session:null
    session:{
        id:'x',
    },
    rewardPreview:{
        xp:50,
        coins:25,
    },
    knowledgeStreak:{
        current:3,
        longest:7,
    },
}

//GET /api/v1/quiz/topics
const topicSummary:QuizTopicSummary={
    key:'CREDIT_SCORE',
    name:'Credit Score',
    description:'Learn how everyday payment behaviour affects financial health.',
    available:true,
    questionCount:5,
    rewardPreview:{
        xp:20,
        coins:10,
    },
}
const unavailableTopic:QuizTopicSummary={
    key:'BUDGETING',
    name:'Budgeting',
    description:'',
    available:false,
    questionCount:0,
    rewardPreview:null,//contract requires this to be nullable
}
const topicDetail:QuizTopicDetail={
    key:'CREDIT_SCORE',
    name:'Credit Score',
    description:'',
    teachingContent:{
        title:'How payment behaviour affects your score',
        body:'Paying obligations on time gives the model positive evidence of reliable behaviour.',
        keyPoints:[
            'On-time payments build positive history.',
        ],
    },
    available:true,
    questionCount:5,
}

//POST /api/v1/quiz/sessions
const dailyRequest:CreateQuizSessionRequest={
    type:'DAILY',
}
const topicRequest:CreateQuizSessionRequest={
    type:'TOPIC',
    topic:'CREDIT_SCORE',
}

//@ts-expect-error->TOPIC requests must include a topic
const invalidTopicRequest:CreateQuizSessionRequest={
    type:'TOPIC',
}
const inProgressSession:QuizSession={
    id:'session_123',
    type:'DAILY',
    topic:null,
    status:'IN_PROGRESS',
    startedAt:'2026-07-13T08:00:00.000Z',
    completedAt:null,//must be nullable, a bare string type would reject this
    progress:{
        correct:0,
        answeredAttempts:0,
        initialQuestions:5,
        remainingQueue:5,
    },
    currentQuestion:question,
    rewardPreview:{
        xp:50,
        coins:25,
    },
}
const completedSession:QuizSession={
    ...inProgressSession,
    status:'COMPLETED',
    completedAt:'2026-07-13T08:12:00.000Z',
    currentQuestion:null,
    result:{
        score:5,
        totalQuestions:5,
        answeredAttempts:7,
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
    },
}

//POST /api/v1/quiz/sessions/:id/answer
const answerRequest:SubmitQuizAnswerRequest={
    questionId:'question_123',
    selectedOptionKey:'A',
}
const feedback:QuizAnswerFeedback={
    isCorrect:true,
    explanation:'Paying on time provides positive evidence of reliable behaviour.',
    requeued:false,
}
const finalAnswer:SubmitQuizAnswerResponse={
    sessionId:'session_123',
    status:'COMPLETED',
    feedback,
    progress:{
        correct:5,
        answeredAttempts:7,
        initialQuestions:5,
        remainingQueue:0,
    },
    nextQuestion:null,
    result:{
        score:5,
        totalQuestions:5,
        answeredAttempts:7,
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
    },
}

//Container for it all
const apiError:ApiErrorResponse={
    statusCode:400,
    message:'Invalid body, option, topic, or session state',
    timestamp:'2026-07-13T10:00:00.000Z',
    path:'/api/v1/quiz/sessions/session-id/answer',
}
expectTypeOf(apiError.statusCode).toBeNumber()

//Prevent "declared but never read" lint noise for the fixtures above.
expectTypeOf([
    dailyAvailable,
    dailyInProgress,
    dailyCompleted,
    badDaily,
    topicSummary,
    unavailableTopic,
    topicDetail,
    dailyRequest,
    topicRequest,
    invalidTopicRequest,
    inProgressSession,
    completedSession,
    answerRequest,
    finalAnswer,
    apiError,
    option,
]).toBeArray()