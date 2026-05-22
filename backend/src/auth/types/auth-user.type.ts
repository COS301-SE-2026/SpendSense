// decoded supabase jwt payload attached to all authenticated requests
// populated by SupabaseJwtGuard and available via @CurrentAuthUser()

export interface AuthUser {
  supabaseAuthId: string; // supabase auth user id
  email: string | null; // email from the jwt
}
