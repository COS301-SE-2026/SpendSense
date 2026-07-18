import {describe,it,expect,vi,beforeEach} from 'vitest'
import {apiFetch} from '../lib/api'
import {getDailyQuiz,
    getQuizTopics,
    getQuizTopic,
    createQuizSession,
    getQuizSession,
    submitQuizAnswer} from '../features/quiz/quizApi'

// Mock the low-level fetch wrapper. these tests assert exactly what it sends and exactlywhat it hands back  Behavioural tests (races, loadingstate, etc.) belong in useQuizSession.test.ts, not here.
vi.mock('../lib/api')


const mockedApiFetch=vi.mocked(apiFetch)

beforeEach(()=>{
    mockedApiFetch.mockReset()
})

describe('getDailyQuiz',()=>{
    it('GETs /api/v1/quiz/daily and unwraps data',async()=>{
        const payload={date:'2026-07-14',status:'AVAILABLE',session:null}
        mockedApiFetch.mockResolvedValue({data:payload})
        const result=await getDailyQuiz()
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/daily',
            expect.objectContaining({method:'GET'}),
        )
        expect(result).toEqual(payload)
    })
    it('forwards an AbortSignal when provided',async()=>{
        mockedApiFetch.mockResolvedValue({data:{}})
        const controller=new AbortController()
        await getDailyQuiz({signal:controller.signal})
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/daily',
            expect.objectContaining({signal:controller.signal}),
        )
    })
    it('propagates rejection without swallowing it',async()=>{
        mockedApiFetch.mockRejectedValue(new Error('network down'))
        await expect(getDailyQuiz()).rejects.toThrow('network down')
    })
})

describe('getQuizTopics',()=>{
    it('GETs /api/v1/quiz/topics and unwraps data',async()=>{
        const payload=[{
                key:'CREDIT_SCORE',
                name:'Credit Score',
                description:'',
                available:true,
                questionCount:5,
                rewardPreview:{xp:20,coins:10},
            },
        ]
        mockedApiFetch.mockResolvedValue({data:payload})
        const result=await getQuizTopics()
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/topics',
            expect.objectContaining({method:'GET'}),
        )
        expect(result).toEqual(payload)
    })
})

describe('getQuizTopic',()=>{
    it('GETs /api/v1/quiz/topics/:topic with the topic interpolated in the path',async()=>{
        const payload={
            key:'CREDIT_SCORE',
            name:'Credit Score',
            description:'',
            teachingContent:{title:'',body:'',keyPoints:[]},
            available:true,
            questionCount:5,
        }
        mockedApiFetch.mockResolvedValue({data:payload})
        const result=await getQuizTopic('CREDIT_SCORE')
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/topics/CREDIT_SCORE',
            expect.objectContaining({method:'GET'}),
        )
        expect(result).toEqual(payload)
    })
    it('interpolates a different topic correctly (guards against a hardcoded path)',async()=>{
        mockedApiFetch.mockResolvedValue({data:{}})
        await getQuizTopic('BUDGETING')
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/topics/BUDGETING',
            expect.anything(),
        )
    })
})

describe('createQuizSession',()=>{
    it('POSTs a DAILY request with the correct body',async()=>{
        const payload={id:'s1',type:'DAILY'}
        mockedApiFetch.mockResolvedValue({data:payload})
        const result=await createQuizSession({type:'DAILY'})
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/sessions',
            expect.objectContaining({
                method:'POST',
                body:JSON.stringify({type:'DAILY'}),
            }),
        )
        expect(result).toEqual(payload)
    })
    it('POSTs a TOPIC request with the topic included in the body',async()=>{
        mockedApiFetch.mockResolvedValue({data:{id:'s2',type:'TOPIC'}})
        await createQuizSession({type:'TOPIC',topic:'CREDIT_SCORE'})
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/sessions',
            expect.objectContaining({
                method:'POST',
                body:JSON.stringify({type:'TOPIC',topic:'CREDIT_SCORE'}),
            }),
        )
    })
})

describe('getQuizSession',()=>{
    it('GETs /api/v1/quiz/sessions/:id with the id interpolated',async()=>{
        const payload={id:'session_123',status:'IN_PROGRESS'}
        mockedApiFetch.mockResolvedValue({data:payload})
        const result=await getQuizSession('session_123')
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/sessions/session_123',
            expect.objectContaining({method:'GET'}),
        )
        expect(result).toEqual(payload)
    })
})

describe('submitQuizAnswer',()=>{
    it('POSTs to /api/v1/quiz/sessions/:id/answer ->not a literal template string',async()=>{
        const payload={sessionId:'session_123',status:'IN_PROGRESS'}
        mockedApiFetch.mockResolvedValue({data:payload})
        const result=await submitQuizAnswer('session_123',{
            questionId:'question_1',
            selectedOptionKey:'A',
        })
        const [calledUrl]=mockedApiFetch.mock.calls[0]
        expect(calledUrl).toBe('/api/v1/quiz/sessions/session_123/answer')
        expect(calledUrl).not.toContain('${')
        expect(result).toEqual(payload)
    })
    it('sends the answer as the JSON body, not interpolated into the URL',async()=>{
        mockedApiFetch.mockResolvedValue({data:{}})
        await submitQuizAnswer('session_123',{
            questionId:'question_1',
            selectedOptionKey:'B',
        })
        expect(mockedApiFetch).toHaveBeenCalledWith(
            '/api/v1/quiz/sessions/session_123/answer',
            expect.objectContaining({
                method:'POST',
                body:JSON.stringify({questionId:'question_1',selectedOptionKey:'B'}),
            }),
        )
    })
    it('forwards an AbortSignal for cancellation',async()=>{
        mockedApiFetch.mockResolvedValue({data:{}})
        const controller=new AbortController()
        await submitQuizAnswer(
            'session_123',
            {questionId:'q1',selectedOptionKey:'A'},
            {signal:controller.signal},
        )
        expect(mockedApiFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({signal:controller.signal}),
        )
    })
    it('propagates rejection without swallowing it',async()=>{
        mockedApiFetch.mockRejectedValue(new Error('500'))
        await expect(
            submitQuizAnswer('s1',{questionId:'q1',selectedOptionKey:'A'}),
        ).rejects.toThrow('500')
    })
})