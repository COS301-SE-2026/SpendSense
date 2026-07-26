import {apiFetch} from '../../lib/api'
import type {NotificationFilters,NotificationResponse,NotificationsResponse} from '../../types/NotificationTypes'
// notificationsApi: in-app notification inbox
// notification types include: PAYMENT_REMINDER, SCORE_CHANGE, BADGE_EARNED, PAYMENT_UPDATE
// readAt is set server side by markAsRead (dont patch locally and assume success)

// planned endpoints:
// GET /api/v1/notifications
// PATCH /api/v1/notifications/:id/read

export async function getNotifications(filters:NotificationFilters={},signal?:AbortSignal):Promise<NotificationsResponse>{
    const query=new URLSearchParams()
    if(filters.unreadOnly!==undefined){
        query.set('unreadOnly',String(filters.unreadOnly))
    }
    if(filters.type!==undefined){
        query.set('type',filters.type)
    }
    if(filters.page!==undefined){
        query.set('page',String(filters.page))
    }
    if(filters.perPage!==undefined){
        query.set('perPage',String(filters.perPage))
    }
    const queryString=query.toString()
    return apiFetch<NotificationsResponse>(`/notifications${queryString?`?${queryString}`:''}`,{signal})
}

export async function markAsRead(id:string,signal?:AbortSignal):Promise<NotificationResponse>{
    return apiFetch<NotificationResponse>(`/notifications/${id}/read`,{
        method:'PATCH',
        signal,
    })
}