import {apiFetch} from '../../lib/api'

// notificationsApi: in-app notification inbox
// notification types include: PAYMENT_REMINDER, SCORE_CHANGE, BADGE_EARNED, PAYMENT_UPDATE
// readAt is set server side by markAsRead (dont patch locally and assume success)

// planned endpoints:
// GET /api/v1/notifications
// PATCH /api/v1/notifications/:id/read

export async function getNotifications(params?:{
    unreadOnly?: boolean
    page?: number
    perPage?: number
})
{
    const query = new URLSearchParams()
    if(params?.unreadOnly !== undefined){
        query.set('unreadOnly', String(params.unreadOnly))
    }
    if(params?.page){
        query.set('page', String(params.page))
    }
    if(params?.perPage){
        query.set('perPage', String(params.perPage))
    }
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiFetch(`/notifications${qs}`)
}

export async function markAsRead(id: string){
    return apiFetch(`/notifications/${id}/read`, {method: 'PATCH'})
}