/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import {render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter, Route, Routes} from 'react-router-dom'
import {it, describe, expect, beforeEach, vi, afterEach} from 'vitest'
import StickerDetailPage from '../domains/StickerDetailPage'

// mocking the nav
const mockNav = vi.fn()
vi.mock('react-router-dom', async()=>{
    const actual = await vi.importActual('react-router-dom')
    return{
        ...actual,
        useNavigate: ()=>mockNav,
    }
})

// renders the detail page with specific badgeId in the route
function renderDetail(badgeId: string){
    return render(
        <MemoryRouter initialEntries={[`/stickers/${badgeId}`]}>
            <Routes>
                <Route path="/stickers/:badgeId" element={<StickerDetailPage/>}/>
            </Routes>
        </MemoryRouter>
    )
}

describe('StickerDetailPage', ()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        vi.useFakeTimers()
    })
    afterEach(()=>{
        vi.useRealTimers()
    })

    // loading state
    it('renders loading skeleton before data arrives', ()=>{
        renderDetail('ub3')
        const skel = document.querySelector('.animate-pulse')
        expect(skel).toBeInTheDocument()
    })
 
    // header
    it('renders quest reward heading', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText('Quest Reward')
        ).toBeInTheDocument())
    })

    it('renders back button', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByRole('button', {name: /go back/i})
        ).toBeInTheDocument())
    })

    it('renders the share button', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByRole('button',{name: /share/i})
        ).toBeInTheDocument())
    })
 
    it('calls navigate to /stickers when back button clicked', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> screen.getByRole('button',{name: /go back/i}))
        screen.getByRole('button', {name: /go back/i}).click()
        expect(mockNav).toHaveBeenCalledWith('/stickers')
    })
 
    // badge content
    it('renders the badge name', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText('Budget Boss')
        ).toBeInTheDocument())
    })

    it('renders earned on date pill', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/earned on/i)
        ).toBeInTheDocument())
    })

    it('renders the badge description in quotes', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/The vault is proud/i)
        ).toBeInTheDocument())
    })

    it('renders the xp pill when xp is greater than zero', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/\+150 XP/i)
        ).toBeInTheDocument())
    })

    it('renders the tier pill', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/Rare Tier/i)
        ).toBeInTheDocument())
    })

    it('renders the share the win button', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/share the win/i)
        ).toBeInTheDocument())
    })

    it('renders the back to album link', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/back to album/i)
        ).toBeInTheDocument())
    })

    it('calls navigate to /stickers when back to album is clicked', async()=>{
        renderDetail('ub3')
        vi.runAllTimersAsync()
        await waitFor(()=> screen.getByText(/back to album/i))
        screen.getByText(/back to album/i).click()
        expect(mockNav).toHaveBeenCalledWith('/stickers')
    })

    // different badges
    it('renders a different badge correctly for First Quest', async()=>{
        renderDetail('ub1')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText('First Quest')
        ).toBeInTheDocument())
    })

    it('renders Common tier for First Quest badge', async()=>{
        renderDetail('ub1')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/Common Tier/i)
        ).toBeInTheDocument())
    })

    // not found state
    it('renders a not found message for an unknown badge id', async()=>{
        renderDetail('does-not-exist')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/sticker not found/i)
        ).toBeInTheDocument())
    })
 
    it('renders back to album link on the not found screen', async()=>{
        renderDetail('does-not-exist')
        vi.runAllTimersAsync()
        await waitFor(()=> expect(
            screen.getByText(/back to album/i)
        ).toBeInTheDocument())
    })
})
