import {supabase} from './supabase'
import {getToken} from './tokenStore'

const apiBaseUrl = import.meta.env.VITE_API_URL

if(!apiBaseUrl){
    throw new Error('Missing VITE_API_URL environment variable.')
}

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    let token = getToken()
    if(!token){
        const {data: sessionData} = await supabase.auth.getSession()
        token = sessionData.session?.access_token ?? null
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    }

    if(token){
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {...options, headers})

    if(!response.ok){
        const error = await response.json().catch(()=>({message: response.statusText}))

        throw Object.assign(new Error(error.message ?? 'API request failed'), {
            statusCode: response.status,
            error,
        })
    }

    return response.json() as Promise<T>
}