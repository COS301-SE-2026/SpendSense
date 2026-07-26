import React from 'react'
import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe,it,expect,vi,beforeEach} from 'vitest'
import TopicQuizPage from '../domains/TopicQuizPage'
import {getQuizTopics} from '../features/quiz/quizApi'
import type {QuizTopicSummary} from '../features/quiz/quizTypes'
import '@testing-library/jest-dom'

vi.mock('@/features/quiz/quizApi',()=>({
    getQuizTopics:vi.fn(),
}))

const mockNavigate=vi.fn()

vi.mock('react-router-dom',async()=>{
    const actual=await vi.importActual<typeof import('react-router-dom')>(
        'react-router-dom'
    )

    return{
        ...actual,
        useNavigate:()=>mockNavigate,
    }
})

function availableTopic(
    overrides:Partial<QuizTopicSummary>={}
):QuizTopicSummary{
    return{
        key:'BUDGETING',
        name:'Budgeting',
        description:'Learn how to plan your spending.',
        available:true,
        questionCount:5,
        rewardPreview:{
            xp:20,
            coins:10,
        },
        ...overrides,
    }
}

function lockedTopic(
    overrides:Partial<QuizTopicSummary>={}
):QuizTopicSummary{
    return{
        key:'CREDIT_SCORE',
        name:'Credit Score',
        description:'Understand what drives your score.',
        available:false,
        questionCount:0,
        rewardPreview:null,
        ...overrides,
    }
}

function mockPendingTopicsRequest(){
    vi.mocked(getQuizTopics).mockReturnValue(
        new Promise<QuizTopicSummary[]>(()=>{})
    )
}

function renderPicker(){
    return render(
        <MemoryRouter>
            <TopicQuizPage/>
        </MemoryRouter>
    )
}

describe('TopicQuizPage',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
    })
    // Header
    it('renders the Quiz Topics heading',()=>{
        mockPendingTopicsRequest()
        renderPicker()
        expect(screen.getByText('Quiz Topics')).toBeInTheDocument()
    })
    it('renders the back button',()=>{
        mockPendingTopicsRequest()
        renderPicker()
        expect(screen.getByRole('button',{name:/go back/i})).toBeInTheDocument()
    })
    it('calls navigate("/quests") when back button is clicked',()=>{
        mockPendingTopicsRequest()
        renderPicker()
        fireEvent.click(screen.getByRole('button',{name:/go back/i})
        )
        expect(mockNavigate).toHaveBeenCalledWith('/quests')
    })
    // Page introduction
    it('renders the pick a topic heading and subtitle',()=>{
        mockPendingTopicsRequest()
        renderPicker()
        expect(screen.getByText('Pick a Topic')).toBeInTheDocument()
        expect(screen.getByText(/test your money smarts/i)).toBeInTheDocument()
    })
    // Loading state
    it('renders loading skeletons while topics are being fetched',()=>{
        mockPendingTopicsRequest()
        renderPicker()
        const skeletons=document.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })
    it('does not render topic names while loading',()=>{
        mockPendingTopicsRequest()
        renderPicker()
        expect(screen.queryByText('Budgeting')).not.toBeInTheDocument()
    })
    // Error state
    it('renders an error banner when the fetch rejects',async()=>{
        vi.mocked(getQuizTopics).mockRejectedValue(
            new Error('Network down')
        )
        renderPicker()
        expect(await screen.findByText('Network down')).toBeInTheDocument()
    })
    it('renders a retry button when the fetch rejects',async()=>{
        vi.mocked(getQuizTopics).mockRejectedValue(
            new Error('Network down')
        )
        renderPicker()
        expect(await screen.findByRole('button',{name:'Retry'})).toBeInTheDocument()
    })
    // Available topics
    it('renders available topic information and reward preview',async()=>{
        vi.mocked(getQuizTopics).mockResolvedValue([
            availableTopic(),
        ])
        renderPicker()
        expect(await screen.findByText('Budgeting')).toBeInTheDocument()
        expect(screen.getByText('Learn how to plan your spending.')).toBeInTheDocument()
        expect(screen.getByText(/5 questions/)).toBeInTheDocument()
        expect(screen.getByText(/20 XP/)).toBeInTheDocument()
        expect(screen.getByText(/10 coins/)).toBeInTheDocument()
    })
    it('does not disable an available topic button',async()=>{
        vi.mocked(getQuizTopics).mockResolvedValue([
            availableTopic(),
        ])
        renderPicker()
        const card=await screen.findByRole('button',{name:'Budgeting quiz',})
        expect(card).not.toBeDisabled()
    })
    // Locked topics
    it('renders a locked topic as disabled with coming soon',async()=>{
        vi.mocked(getQuizTopics).mockResolvedValue([
            lockedTopic(),
        ])
        renderPicker()
        const card=await screen.findByRole('button',{name:'Credit Score locked',})
        expect(card).toBeDisabled()
        expect(screen.getByText('Coming soon')).toBeInTheDocument()
    })
    it('does not display reward preview text for a locked topic',async()=>{
        vi.mocked(getQuizTopics).mockResolvedValue([
            lockedTopic(),
        ])
        renderPicker()
        await screen.findByText('Coming soon')
        expect(screen.queryByText(/XP/)).not.toBeInTheDocument()
        expect(screen.queryByText(/coins/)).not.toBeInTheDocument()
    })
    // Navigation
    it('navigates to the topic route when an available topic is pressed',async()=>{
        vi.mocked(getQuizTopics).mockResolvedValue([
            availableTopic(),
        ])
        renderPicker()
        const card=await screen.findByRole('button',{name:'Budgeting quiz',})
        fireEvent.click(card)
        await waitFor(()=>{
            expect(mockNavigate).toHaveBeenCalledWith('/quiz/topics/BUDGETING')
        })
    })
    it('does not navigate when a locked topic is pressed',async()=>{
        vi.mocked(getQuizTopics).mockResolvedValue([
            lockedTopic(),
        ])
        renderPicker()
        const card=await screen.findByRole('button',{name:'Credit Score locked',})
        fireEvent.click(card)
        expect(mockNavigate).not.toHaveBeenCalled()
    })
    // Retry
    it('retries the fetch when the retry button is pressed',async()=>{
        vi.mocked(getQuizTopics)
            .mockRejectedValueOnce(new Error('Network down'))
            .mockResolvedValueOnce([availableTopic()])
        renderPicker()
        const retryButton=await screen.findByRole('button',{name:'Retry',})
        fireEvent.click(retryButton)
        expect(await screen.findByText('Budgeting')).toBeInTheDocument()
        expect(getQuizTopics).toHaveBeenCalledTimes(2)
    })
    // Empty state
    it('renders an empty-state message when no topics are returned',async()=>{
        vi.mocked(getQuizTopics).mockResolvedValue([])
        renderPicker()
        expect(await screen.findByText('No quiz topics available right now.')).toBeInTheDocument()
    })
})