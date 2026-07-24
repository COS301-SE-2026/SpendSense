import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, it, expect} from 'vitest'
import '@testing-library/jest-dom'
import HelpPage from '../domains/HelpPage'
import { Expand } from 'lucide-react'

function renderPage(){
    return render(
        <MemoryRouter>
            <HelpPage/>
        </MemoryRouter>
    )
}

describe('HelpPage', ()=> {
    it('renders the walkthrough steps in order', ()=> {
        renderPage()
        expect(screen.getByText(/1\. start on the dashboard/i)).toBeInTheDocument()
        expect(screen.getByText(/7\. make it yours in profile/i)).toBeInTheDocument()
    })

    it('renders the FAQ questions collapsed by default', ()=> {
        renderPage()
        expect(screen.getByText(/is my credit score real\?/i)).toBeInTheDocument()
        expect(screen.queryByText(/it's a simulation built for learning/i)).not.toBeInTheDocument()
    })

    it('expands an answer on click and collapses it on second click', ()=> {
        renderPage()
        const question= screen.getByRole('button', {name: /is my credit score real\?/i})

        fireEvent.click(question)
        expect(question).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByText(/simulation built for learning/i)).toBeInTheDocument()

        fireEvent.click(question)
        expect(question).toHaveAttribute('aria-expanded', 'false')
        expect(screen.queryByText(/simulation built for learning/i)).not.toBeInTheDocument()
    })

    it('opens only one answer at a time', ()=> {
        renderPage()
        fireEvent.click(screen.getByRole('button', {name: /is my credit score real\?/i}))
        fireEvent.click(screen.getByRole('button', {name: /how do payment streaks work\?/i}))

        expect(screen.getByText(/consecutive on-time payment extends your streak/i)).toBeInTheDocument()
        expect(screen.queryByText(/simulation built for learning/i)).not.toBeInTheDocument()
    })

    it('filters questions by search text', ()=> {
        renderPage()
        const search= screen.getByLabelText(/search frequently asked questions/i)
        fireEvent.change(search, {target: {value: 'streak'}})
        expect(screen.getByText(/how do payment streaks work\?/i)).toBeInTheDocument()
        expect(screen.queryByText(/i my credit score real\?/i)).not.toBeInTheDocument()
    })

    it('shows a friendly message when no questions match', ()=> {
        renderPage()
        fireEvent.change(screen.getByLabelText(/search frequently asked questions/i), {
            target: {value: 'zzzz-no-match'},
        })

        expect(screen.getByText(/no questions match your search/i)).toBeInTheDocument()
    })

    it('shows the score disclaimer', ()=> {
        renderPage()
        expect(screen.getByText(/educational approximations/i)).toBeInTheDocument()
    })
})