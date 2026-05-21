import {useEffect, useState} from 'react'
import {Navigate} from 'react-router-dom'
import {getCurrentSession} from '../features/auth/auth.service'

export default function ProtectedRoute({children}: {children: React.ReactNode}) {
    const [checking, setChecking] = useState(true)
    const [authed, setAuthed] = useState(false)

    useEffect(() => {
        getCurrentSession().then(session => {
            setAuthed(!!session)
            setChecking(false)
        })
    }, [])

    if (checking) return null
    if (!authed) return <Navigate to="/login" replace />
    return <>{children}</>
}
