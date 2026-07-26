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
        const select=screen.getByRole('combobox',{
            name:'Notification type',
        })
        expect(select).toBeInTheDocument()
        expect(select).toHaveValue('')
        expect(
            screen.getByRole('option',{
                name:'All types',
            }),
        ).toBeInTheDocument()
    })
    it('renders every notification type option',()=>{
        render(
            <NotificationTypeFilter
                value=""
                onChange={vi.fn()}
            />,
        )
        expect(screen.getAllByRole('option')).toHaveLength(7)
        expect(
            screen.getByRole('option',{
                name:'Reminders',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option',{
                name:'Payment status',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option',{
                name:'Score changes',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option',{
                name:'Badges',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option',{
                name:'Rewards',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option',{
                name:'System',
            }),
        ).toBeInTheDocument()
    })
    it('calls onChange when a type is selected',async()=>{
        const user=userEvent.setup()
        const onChange=vi.fn()
        render(
            <NotificationTypeFilter
                value=""
                onChange={onChange}
            />,
        )
        await user.selectOptions(
            screen.getByRole('combobox',{
                name:'Notification type',
            }),
            'BADGE_EARNED',
        )
        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith('BADGE_EARNED')
    })
    it('shows the currently selected type',()=>{
        render(
            <NotificationTypeFilter
                value="REMINDER"
                onChange={vi.fn()}
            />,
        )
        expect(
            screen.getByRole('combobox',{
                name:'Notification type',
            }),
        ).toHaveValue('REMINDER')
        expect(
            screen.getByRole('option',{
                name:'Reminders',
            }),
        ).toBeChecked()
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
        await user.selectOptions(
            screen.getByRole('combobox',{
                name:'Notification type',
            }),
            '',
        )
        expect(onChange).toHaveBeenCalledWith('')
    })
})