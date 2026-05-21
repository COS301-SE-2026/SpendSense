/// <reference types="@testing-library/jest-dom"/>
import React from 'react'
import {render, screen, waitFor, fireEvent} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {it, describe, expect, beforeEach, vi, afterEach} from 'vitest'
import StickerAlbumPage from '../domains/StickerAlbumPage'

// mocking the nav
const mockNav = vi.fn()
vi.mock('react-router-dom', async()=>{
    const actual = await vi.importActual('react-router-dom')
    return{
        ...actual,
        useNavigate: ()=>mockNav,
    }
})
 
function renderAlbum(){
    return render(
        <MemoryRouter>
            <StickerAlbumPage/>
        </MemoryRouter>
    )
}

describe('StickerAlbumPage', ()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        vi.useFakeTimers()
    })
    afterEach(()=>{
        vi.useRealTimers()
    })

    // laod
    it('renders loading skeleton before the data arrives', ()=>{
        renderAlbum()
        const skel = document.querySelectorAll('.animate-pulse')
        expect(skel.length).toBeGreaterThan(0)
    })

    // header
    it('renders Sticker Album heading on the page', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=>expect(
            screen.getByText('Sticker Album')
        ).toBeInTheDocument()
    )
    })

    it('renders the back button', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByRole('button',{name: /go back/i})
        ).toBeInTheDocument())
    })
 
    it('renders search button', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByRole('button',{name: /search stickers/i})
        ).toBeInTheDocument())
    })

    it('calls navigate(-1) when back button clicked', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> screen.getByRole('button',{name: /go back/i}))
        fireEvent.click(screen.getByRole('button',{name: /go back/i}))
        expect(mockNav).toHaveBeenCalledWith(-1)
    })
 
    it('renders stickers found count', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText('Stickers Found')
        ).toBeInTheDocument())
    })

    it('renders the completion percentage', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/completion:/i)
        ).toBeInTheDocument())
    })
 
    it('renders core milestone category', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText('Core Milestones')
        ).toBeInTheDocument())
    })

    it('renders savings quest category', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText('Savings Quests')
        ).toBeInTheDocument())
    })

    it('renders special events category', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText('Special Events')
        ).toBeInTheDocument())
    })


    it('renders names of earned stickers', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=>{
            expect(screen.getByText('First Quest')).toBeInTheDocument()
            expect(screen.getByText('7-Day Streak')).toBeInTheDocument()
            expect(screen.getByText('Budget Boss')).toBeInTheDocument()
            expect(screen.getByText('Bill Slayer')).toBeInTheDocument()
        })
    })

    it('renders locked stickers', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=>{
            const lockedLabels = screen.getAllByText('Locked')
            expect(lockedLabels.length).toBeGreaterThan(0)
        })
    })

    it('stickers earned buttons have accessible label', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByRole('button',{name: /first quest sticker, tap to view/i})
        ).toBeInTheDocument())
    })

    it('locked stickers diables', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(() => {
            const lockedBtn = screen.getByRole('button',{name: /early bird locked/i})
            expect(lockedBtn).toBeDisabled()
        })
    })
 
    it('goes to sticker detail page when sticker is clicked', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(()=>screen.getByRole('button',{name: /first quest sticker, tap to view/i}))
        fireEvent.click(screen.getByRole('button',{name: /first quest sticker, tap to view/i}))
        expect(mockNav).toHaveBeenCalledWith('/stickers/ub1')
    })
    
    it('will not navigate when a locked sticker is clicked', async()=>{
        renderAlbum()
        vi.runAllTimersAsync()
        await waitFor(() => screen.getByRole('button',{name: /early bird locked/i}))
        fireEvent.click(screen.getByRole('button',{name: /early bird locked/i}))
        expect(mockNav).not.toHaveBeenCalled()
    })
})