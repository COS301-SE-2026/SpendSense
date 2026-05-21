import React, { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DashboardPage from '@/domains/DashboardPage.tsx'
import CalendarPage from '@/domains/CalendarPage.tsx'
import LoginPage from './domains/LoginPage'
import RegisterPage from './domains/RegisterPage.tsx'
import StickerAlbumPage from './domains/StickerAlbumPage'
import StickerDetailPage from './domains/StickerDetailPage'
import {initAuthListener} from './features/auth/auth.service'

initAuthListener()

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<DashboardPage />}/>
                <Route path="/domains/dashboard" element={<DashboardPage />}/>
                <Route path="/dev" element={<App />}/>
                <Route path="/calendar" element={<CalendarPage />}/>
                <Route path="/login" element={<LoginPage />}/>
                <Route path="/register" element={<RegisterPage/>}/>
                <Route path="/stickers" element={<StickerAlbumPage />}/>
                <Route path="/stickers/:badgeId" element={<StickerDetailPage />}/>
            </Routes>
        </BrowserRouter>
    </StrictMode>,
)