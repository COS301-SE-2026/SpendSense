export type DashboardUserSummary = {
  id: string
  email: string
  displayName: string
  avatarUrl?: string | null
  onboardingCompleted: boolean
  createdAt: string
}

export type DashboardCreditProfile = {
  id: string
  userId: string
  currentScore: number
  previousScore: number
  scoreTier: string
  onTimePaymentCount: number
  latePaymentCount: number
  missedPaymentCount: number
  currentUtilisationScore: string | number | null
  lastCalculatedAt: string | null
}

export type DashboardGamificationProfile = {
  id: string
  userId?: string
  coinBalance: number
  xp: number
  mascotLevel: number
  mascotMood: string
  currentPaymentStreak: number
  longestPaymentStreak: number
  currentKnowledgeStreak: number
  longestKnowledgeStreak: number
}

export type DashboardPayment = {
  id: string
  amountDue: number | string
  currency: string
  status: string
  dueDate?: string
  obligation?: {
    id?: string
    name?: string
    type?: string
    priority?: string
  }
}

export type DashboardData = {
  userSummary: DashboardUserSummary
  creditProfile: DashboardCreditProfile
  gamificationProfile: DashboardGamificationProfile
  upcomingPayments: DashboardPayment[]
  overduePayments: DashboardPayment[]
  recentBadges: unknown[]
  recentScoreEvents: unknown[]
  unreadNotifications: unknown[]
  stickerStats?: {
    collected: number
    total: number
  }
}
