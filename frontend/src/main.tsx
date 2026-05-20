import React, { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DashboardPage from '@/features/dashboard/DashboardPage'
import './index.css'
const LoginPage = React.lazy(() => import('./domains/LoginPage'));
import CalendarPage from '@/features/calendar/CalendarPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dev" element={<App />} />
        <Route path="/" element={<App />}/>
        <Route path="/calendar" element={<CalendarPage />}/>
        <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>}/>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
