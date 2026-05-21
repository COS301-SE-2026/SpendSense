import React, { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DashboardPage from '@/features/dashboard/DashboardPage'
import LoginPage from './domains/LoginPage'
import StickerAlbumPage from './domains/StickerAlbumPage'
import StickerDetailPage from './domains/StickerDetailPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />}/>
        <Route path="/dev" element={<App />}/>
        <Route path="/login" element={<LoginPage />}/>
        <Route path="/stickers" element={<StickerAlbumPage />}/>
        <Route path="/stickers/:badgeId" element={<StickerDetailPage />}/>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)