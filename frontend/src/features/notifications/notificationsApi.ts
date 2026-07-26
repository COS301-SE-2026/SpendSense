import {apiFetch} from '../../lib/api'
import type {NotificationFilters,NotificationResponse,NotificationsResponse} from '../../types/NotificationTypes'
// notificationsApi: in-app notification inbox
// notification types include: PAYMENT_REMINDER, SCORE_CHANGE, BADGE_EARNED, PAYMENT_UPDATE
// readAt is set server side by markAsRead (dont patch locally and assume success)

// planned endpoints:
// GET    /api/v1/notifications
// PATCH  /api/v1/notifications/:id/read
// PATCH  /api/v1/notifications/read       (bulk)
// DELETE /api/v1/notifications/:id
// DELETE /api/v1/notifications            (bulk)

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

export async function markManyAsRead(ids:string[],signal?:AbortSignal):Promise<{data:{updated:number}}>{
    return apiFetch<{data:{updated:number}}>('/notifications/read',{
        method:'PATCH',
        body:JSON.stringify({ids}),
        signal,
    })
}

export async function deleteNotification(id:string,signal?:AbortSignal):Promise<{data:{id:string;deletedAt:string}}>{
    return apiFetch<{data:{id:string;deletedAt:string}}>(`/notifications/${id}`,{
        method:'DELETE',
        signal,
    })
}

export async function deleteManyNotifications(ids:string[],signal?:AbortSignal):Promise<{data:{deleted:number}}>{
    return apiFetch<{data:{deleted:number}}>('/notifications',{
        method:'DELETE',
        body:JSON.stringify({ids}),
        signal,
    })
}