import { StrictMode} from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DashboardPage from './features/dashboard/DashboardPage'
import CalendarPage from './features/calendar/CalendarPage'
import LoginPage from './domains/LoginPage';
import RegisterPage from './domains/RegisterPage.tsx';
import ObligationForm from './domains/ObligationForm.tsx'

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
        <Route path="/obligationForm" element={<ObligationForm/>}/>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
