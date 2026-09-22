import {useEffect,useMemo} from 'react'
import {GuideCard} from './GuideCard'
import {useGuidanceOptional} from '@/features/guidance/useGuidance'
import type {GuidanceSurface,GuideFacts} from '@/features/guidance/guidanceTypes'

export interface GuideSlotProps{
    surface:GuidanceSurface
    facts:GuideFacts
    onRetry?:()=>void
    manual?:boolean
    showAvatar?:boolean
    className?:string
}
 
export function GuideSlot({
    surface,
    facts,
    onRetry,
    manual=false,
    showAvatar=true,
    className,
}:GuideSlotProps){
    const guidance=useGuidanceOptional()
    const evaluate=guidance?.evaluate
    const markShown=guidance?.markShown
 
    const guide=useMemo(
        ()=>(evaluate? evaluate(surface,facts,{manual}) : null),
        [evaluate,surface,facts,manual],
    )
 
    useEffect(()=>{
        if(guide&&markShown) markShown(guide.id)
    },[guide,markShown])
 
    if(!guidance||!guide) return null
 
    return(
        <GuideCard
            guide={guide}
            className={className}
            showAvatar={showAvatar}
            onDismiss={guidance.dismiss}
            onRetry={onRetry}
            onNavigate={guidance.suspendWalkthrough}
        />
    )
}