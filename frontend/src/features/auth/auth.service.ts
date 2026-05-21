import {supabase} from '../../lib/supabase'
import {setToken, clearToken} from '../../lib/tokenStore'

export async function signUp(email: string, password: string) {
    const {data, error} = await supabase.auth.signUp({ email, password })
    if (error) 
        throw error
    return data
}

export async function signIn(email: string, password: string) {
    const {data, error} = await supabase.auth.signInWithPassword({ email, password })
    if (error) 
        throw error
    if (data.session?.access_token) {
        setToken(data.session.access_token)
    }
    return data
}

export async function signOut() {
    const {error} = await supabase.auth.signOut()
    if (error) 
        throw error
    clearToken()
}

export async function getCurrentSession() {
    const {data, error} = await supabase.auth.getSession()
    if (error) 
        throw error
    return data.session
}

// Call once at app startup so the stored token stays in sync with Supabase token refreshes.
// Returns an unsubscribe function.
export function initAuthListener(): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token) {
            setToken(session.access_token)
        } else {
            clearToken()
        }
    })
    return () => subscription.unsubscribe()
}
