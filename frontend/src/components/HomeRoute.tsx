import {useEffect, useState} from 'react'
import {Navigate} from 'react-router-dom'
import {getCurrentSession} from '../features/auth/auth.service'
import LandingPage from '../domains/LandingPage'

export default function HomeRoute() {
    const [checking, setChecking] = useState(true)
    const [authed, setAuthed] = useState(false)

    useEffect(() => {
        getCurrentSession().then(session => {
            setAuthed(!!session)
            setChecking(false)
        })
    }, [])

    if (checking) return null
    if (authed) return <Navigate to="/domains/dashboard" replace />
    return <LandingPage />
}
