import * as React from 'react'
import {GuidanceContext} from './GuidanceContextCore'
import type {GuidanceContextValue} from './GuidanceContextCore'

export function useGuidance(){
    const context=React.useContext(GuidanceContext)
    if(!context){
        throw new Error('useGuidance must be used within GuidanceProvider')
    }
    return context
}

export function useGuidanceOptional():GuidanceContextValue|null{
    return React.useContext(GuidanceContext)
}

export function useGuidanceSuppression(key:string,active:boolean):void{
    const guidance=useGuidanceOptional()
    const setBlocked=guidance?.setBlocked
    React.useEffect(()=>{
        if(!setBlocked) return
        setBlocked(key,active)
        return ()=>setBlocked(key,false)
    },[key,active,setBlocked])
}