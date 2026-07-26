import React from 'react'
import {render,screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import {NotificationTypeFilter} from '../components/notifications/NotificationsTypeFilter'

describe('NotificationTypeFilter',()=>{
    it('shows All types when no filter is selected',()=>{
        render(
            <NotificationTypeFilter
                value=""
                onChange={vi.fn()}
            />,
        )
        const trigger=screen.getByRole('button',{
            name:'All types',
        })
        expect(trigger).toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded','false')
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
            screen.getByRole('option',{
                name:'All types',
            }),
        ).toHaveAttribute('aria-selected','true')
        expect(
            screen.getAllByRole('option'),
        ).toHaveLength(7)
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
            screen.getByRole('option',{
                name:'Badges',
            }),
        )
        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith('BADGE_EARNED')
        expect(
            screen.queryByRole('dialog',{
                name:'Filter by notification type',
            }),
        ).not.toBeInTheDocument()
    })
    it('shows the selected type and marks it as active',async()=>{
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
            screen.getByRole('option',{
                name:'Reminders',
            }),
        ).toHaveAttribute('aria-selected','true')
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
            screen.getByRole('option',{
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
            screen.queryByRole('dialog',{
                name:'Filter by notification type',
            }),
        ).not.toBeInTheDocument()
    })
})
