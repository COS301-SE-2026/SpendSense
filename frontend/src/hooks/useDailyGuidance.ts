import {useCallback,useEffect,useRef,useState} from 'react'
import {useGuidance} from '@/features/guidance/useGuidance'
import type {GuidanceDaily} from '@/features/guidance/guidanceTypes'

export type DailyGuidanceStatus='loading'|'ready'|'unavailable'

export interface DailyGuidanceResult{
    status:DailyGuidanceStatus
    data:GuidanceDaily|null
    refresh:()=>void
}

export const DAILY_STALE_AFTER_MS=5*60*1000

export function useDailyGuidance(options?:{
    enabled?:boolean
    staleAfterMs?:number
}):DailyGuidanceResult{
    const {api,userId,localDate,dailyRefreshToken}=useGuidance()
    const enabled=options?.enabled??true
    const staleAfterMs=options?.staleAfterMs??DAILY_STALE_AFTER_MS

    const [status,setStatus]=useState<DailyGuidanceStatus>('loading')
    const [data,setData]=useState<GuidanceDaily|null>(null)
    const [manualToken,setManualToken]=useState(0)
    const fetchedAt=useRef(0)

    const refresh=useCallback(()=>setManualToken((token)=>token+1),[])

    useEffect(()=>{
        if(!enabled||!userId) return

        let active=true
        const controller=new AbortController()

        api.getDaily({signal:controller.signal})
            .then((next)=>{
                if(!active) return
                fetchedAt.current=Date.now()
                setData(next)
                setStatus('ready')
            })
            .catch(()=>{
                if(!active) return
                setData(null)
                setStatus('unavailable')
            })

        return ()=>{
            active=false
            controller.abort()
        }
    },[api,userId,enabled,localDate,dailyRefreshToken,manualToken])

    useEffect(()=>{
        if(!enabled) return
        const onFocus=()=>{
            if(Date.now()-fetchedAt.current>=staleAfterMs) refresh()
        }
        window.addEventListener('focus',onFocus)
        return ()=>window.removeEventListener('focus',onFocus)
    },[enabled,refresh,staleAfterMs])

    return {status,data,refresh}
}