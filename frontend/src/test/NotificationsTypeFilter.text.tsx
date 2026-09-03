import React from 'react'
import {render,screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import {NotificationTypeFilter} from '../components/notifications/NotificationsTypeFilter'

describe('NotificationTypeFilter',()=>{
    beforeEach(()=>{
        HTMLDialogElement.prototype.showModal=vi.fn(function(this:HTMLDialogElement){
            this.setAttribute('open','')
        })
        HTMLDialogElement.prototype.close=vi.fn(function(this:HTMLDialogElement){
            this.removeAttribute('open')
        })
    })
    it('shows All types when no filter is selected',()=>{
        render(
            <NotificationTypeFilter
                value=""
                onChange={vi.fn()}
            />,
        )
        expect(
            screen.getByRole('button',{
                name:'All types',
            }),
        ).toBeInTheDocument()
    })
    it('opens the type-selection dialog',async()=>{
        const user=userEvent.setup()
        render(
            <NotificationTypeFilter
                value=""
                onChange={vi.fn()}
            />,
        )
        await user.click(
            screen.getByRole('button',{
                name:'All types',
            }),
        )
        expect(
            screen.getByRole('dialog',{
                name:'Filter by notification type',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'All types',
            }),
        ).toHaveAttribute('aria-pressed','true')
    })
    it('renders every notification type option',async()=>{
        const user=userEvent.setup()
        render(
            <NotificationTypeFilter
                value=""
                onChange={vi.fn()}
            />,
        )
        await user.click(
            screen.getByRole('button',{
                name:'All types',
            }),
        )
        expect(
            screen.getByRole('button',{
                name:'Reminders',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'Payment status',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'Score changes',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'Badges',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'Rewards',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'System',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'Wager invites',
            }),
        ).toBeInTheDocument()
    })
    it('calls onChange and closes when a type is selected',async()=>{
        const user=userEvent.setup()
        const onChange=vi.fn()
        render(
            <NotificationTypeFilter
                value=""
                onChange={onChange}
            />,
        )
        await user.click(
            screen.getByRole('button',{
                name:'All types',
            }),
        )
        await user.click(
            screen.getByRole('button',{
                name:'Badges',
            }),
        )
        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith('BADGE_EARNED')
        expect(
            screen.getByRole('dialog',{
                name:'Filter by notification type',
                hidden:true,
            }),
        ).not.toHaveAttribute('open')
    })
    it('shows the currently selected type',async()=>{
        const user=userEvent.setup()
        render(
            <NotificationTypeFilter
                value="REMINDER"
                onChange={vi.fn()}
            />,
        )
        expect(
            screen.getByRole('button',{
                name:'Reminders',
            }),
        ).toBeInTheDocument()
        await user.click(
            screen.getByRole('button',{
                name:'Reminders',
            }),
        )
        expect(
            screen.getByRole('button',{
                name:'Reminders',
            }),
        ).toHaveAttribute('aria-pressed','true')
    })
    it('allows the user to clear the selected type',async()=>{
        const user=userEvent.setup()
        const onChange=vi.fn()
        render(
            <NotificationTypeFilter
                value="REWARD"
                onChange={onChange}
            />,
        )
        await user.click(
            screen.getByRole('button',{
                name:'Rewards',
            }),
        )
        await user.click(
            screen.getByRole('button',{
                name:'All types',
            }),
        )
        expect(onChange).toHaveBeenCalledWith('')
    })

    it('closes without changing the value when Cancel is selected',async()=>{
        const user=userEvent.setup()
        const onChange=vi.fn()
        render(
            <NotificationTypeFilter
                value="SYSTEM"
                onChange={onChange}
            />,
        )
        await user.click(
            screen.getByRole('button',{
                name:'System',
            }),
        )
        await user.click(
            screen.getByRole('button',{
                name:'Cancel',
            }),
        )
        expect(onChange).not.toHaveBeenCalled()
        expect(
            screen.getByRole('dialog',{
                name:'Filter by notification type',
                hidden:true,
            }),
        ).not.toHaveAttribute('open')
    })
})