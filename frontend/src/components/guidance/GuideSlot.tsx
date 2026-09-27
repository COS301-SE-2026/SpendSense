import {useEffect,useMemo} from 'react'
import {GuideCard} from './GuideCard'
import type {GuideBubbleTail,GuideCardVariant} from './GuideCard'
import {useGuidanceOptional} from '@/features/guidance/useGuidance'
import type {GuidanceSurface,GuideFacts} from '@/features/guidance/guidanceTypes'

export interface GuideSlotProps{
    surface:GuidanceSurface
    facts:GuideFacts
    onRetry?:()=>void
    onContinue?:()=>void
    manual?:boolean
    showAvatar?:boolean
    variant?:GuideCardVariant
    bubbleTail?:GuideBubbleTail
    className?:string
}

export function GuideSlot({
    surface,
    facts,
    onRetry,
    onContinue,
    manual=false,
    showAvatar=true,
    variant='card',
    bubbleTail='right',
    className,
}:Readonly<GuideSlotProps>){
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
            variant={variant}
            bubbleTail={bubbleTail}
            showAvatar={showAvatar}
            onDismiss={guidance.dismiss}
            onRetry={onRetry}
            onContinue={onContinue}
            onNavigate={guidance.suspendWalkthrough}
        />
    )
}