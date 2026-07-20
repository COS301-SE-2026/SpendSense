import { StrictMode} from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DashboardPage from '@/domains/DashboardPage.tsx'
import CalendarPage from '@/domains/CalendarPage.tsx'
import LoginPage from './domains/LoginPage'
import RegisterPage from './domains/RegisterPage.tsx'
import ObligationForm from './domains/ObligationForm.tsx'
import StickerAlbumPage from './domains/StickerAlbumPage'
import StickerDetailPage from './domains/StickerDetailPage'
import {initAuthListener} from './features/auth/auth.service'
import QuestsPage from './domains/QuestsPage'
import QuizPage from './domains/QuizPage'
import FriendsPage from './domains/FriendsPage'
import { FriendsListPage, AddFriendPage, FriendProfilePage, FriendActivityPage, LeaderboardPage } from './domains/FriendsSubPages'
import ProtectedRoute from './components/ProtectedRoute'
import InsightsPage from './domains/InsightsPage.tsx'
import ProfilePage from './domains/ProfilePage.tsx'
import LandingPage from './domains/LandingPage.tsx'
import OnboardingPage from './domains/OnboardingPage.tsx'
import NotificationsPage from './domains/NotificationsPage.tsx'
import TopicQuizPage from './domains/TopicQuizPage.tsx'
import TopicQuizTeachingPage from './domains/TopicQuizTeachingPage.tsx'
import QuizQuestionPage from './domains/QuizQuestionPage.tsx'

initAuthListener()
import PaymentForm from './domains/PaymentForm.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}/>
        <Route path="/domains/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dev" element={<App />} />
        <Route path="/calendar" element={<CalendarPage />}/>
        <Route path="/login" element={<LoginPage />}/>
        <Route path="/register" element={<RegisterPage/>}/>
        <Route path="/obligationForm" element={<ProtectedRoute><ObligationForm/></ProtectedRoute>}/>
        <Route path="/stickers" element={<StickerAlbumPage />}/>
        <Route path="/stickers/:badgeKey" element={<StickerDetailPage />}/>
        <Route path="/paymentForm" element={<PaymentForm/>}/>
        <Route path="/insights" element={<ProtectedRoute><InsightsPage/></ProtectedRoute>}/>
        <Route path="/profile" element={<ProtectedRoute><ProfilePage/></ProtectedRoute>}/>
        <Route path="/landing" element={<LandingPage/>}/>
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage/></ProtectedRoute>}/>
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage/></ProtectedRoute>}/>
         <Route path="/quests" element={<ProtectedRoute><QuestsPage/></ProtectedRoute>}/>
         <Route path="/quiz" element={<ProtectedRoute><QuizPage/></ProtectedRoute>}/>
         <Route path="/quiz/topics/:topic" element={<ProtectedRoute><TopicQuizTeachingPage/></ProtectedRoute>}/>
         <Route path="/quiz/session/:sessionId" element={<ProtectedRoute><QuizQuestionPage/></ProtectedRoute>}/>
         <Route path="/quiz/topics" element={<ProtectedRoute><TopicQuizPage/></ProtectedRoute>}/>
         <Route path="/friends" element={<FriendsPage/>}/>
         <Route path="/friends/list" element={<FriendsListPage/>}/>
         <Route path="/friends/add" element={<AddFriendPage/>}/>
         <Route path="/friends/:friendId" element={<FriendProfilePage/>}/>
         <Route path="/friends/activity" element={<FriendActivityPage/>}/>
         <Route path="/friends/leaderboard" element={<LeaderboardPage/>}/>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
