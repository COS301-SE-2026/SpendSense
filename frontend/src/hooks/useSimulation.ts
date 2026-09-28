
import {useCallback,useEffect,useRef,useState} from 'react'
import { getSimulation } from '../features/simulation/api'
import type { SimulationDetail } from '../features/simulation/types'

interface SimulationState{
    sessionId:string|null
    data:SimulationDetail|null
    loading:boolean
    error:string|null
}

interface UseSimulationReturn{
    data:SimulationDetail|null
    loading:boolean
    error:string|null
    refetch:()=>Promise<SimulationDetail|null>
    setSimulation:(detail:SimulationDetail)=>void
}

export function useSimulation(sessionId:string|null|undefined):UseSimulationReturn{
    const [state,setState]=useState<SimulationState>({
        sessionId:null,
        data:null,
        loading:false,
        error:null
    })
    const requestId=useRef(0)
    const refetch=useCallback(async():Promise<SimulationDetail|null>=>{
        if(!sessionId){
            return null
        }
        const id=++requestId.current
        setState(current=>({
            sessionId,
            data:current.sessionId===sessionId?current.data:null,
            loading:true,
            error:null
        }))
        try{
            const detail=await getSimulation(sessionId)
            if(id!==requestId.current){
                return null
            }
            setState({
                sessionId,
                data:detail,
                loading:false,
                error:null
            })
            return detail
        }catch(err){
            if(id!==requestId.current){
                return null
            }
            const message=err instanceof Error?err.message:'Failed to load simulation'
            setState(current=>({
                sessionId,
                data:current.sessionId===sessionId?current.data:null,
                loading:false,
                error:message
            }))
            return null
        }
    },[sessionId])
    const setSimulation=useCallback((detail:SimulationDetail)=>{
        if(!sessionId||detail.session.id!==sessionId){
            return
        }
        requestId.current++
        setState({
            sessionId,
            data:detail,
            loading:false,
            error:null
        })
    },[sessionId])
    useEffect(()=>{
        let cancelled=false
        const currentRequestId=requestId
        void Promise.resolve().then(()=>{
            if(!cancelled){
                void refetch()
            }
        })
        return ()=>{
            cancelled=true
            currentRequestId.current++
        }
    },[refetch])
    const current=state.sessionId===sessionId
    return{
        data:current?state.data:null,
        loading:!!sessionId&&(!current||state.loading),
        error:current?state.error:null,
        refetch,
        setSimulation
    }
}