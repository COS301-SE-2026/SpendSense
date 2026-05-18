import {supabase} from '../../lib/supabase'

export async function signUp(email:string, password:string){
    const{data, error}  = await supabase.auth.signUp({email, password})

    if(error){
        throw error
    }
    return data
}

export async function signIn(email:string, password:string){
    const{data, error} = await supabase.auth.signInWithPassword({email, password})

    if(error){
        throw error
    }
    return data
}

export async function signOut(){
    const{error} = await supabase.auth.signOut()

    if(error){
        throw error
    }
}

export async function getCurrentSession(){
    const{data, error} = await supabase.auth.getSession()

    if(error){
        throw error
    }
    return data.session
}