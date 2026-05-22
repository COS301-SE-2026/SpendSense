import {createClient} from '@supabase/supabase-js'

const supabaseURL = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if(!supabaseAnonKey || !supabaseURL){
    throw new Error(
        'Missing Supabase environment variables. Ensure that  VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in your .env file.',
    )
}
export const supabase = createClient(supabaseURL, supabaseAnonKey)