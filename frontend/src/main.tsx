import React, { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DashboardPage from '@/features/dashboard/DashboardPage'
import './index.css'

import CalendarPage from '@/features/calendar/CalendarPage'
import App from './App.tsx'
import LoginPage from './domains/LoginPage';
import RegisterPage from './domains/RegisterPage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dev" element={<App />} />
        <Route path="/" element={<App />}/>
        <Route path="/calendar" element={<CalendarPage />}/>
        <Route path="/login" element={<LoginPage />}/>
        <Route path="/register" element={<RegisterPage/>}/>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
