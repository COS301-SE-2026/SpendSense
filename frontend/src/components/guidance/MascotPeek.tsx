import {GuidanceMascot} from './GuidanceMascot'
import {GuideSlot} from './GuideSlot'
import {useGuidanceOptional} from '@/features/guidance/useGuidance'
import {cn} from '@/lib/utils'
import type {GuidanceSurface,GuideFacts} from '@/features/guidance/guidanceTypes'

export interface MascotPeekProps{
    surface:GuidanceSurface
    facts:GuideFacts
    side?:'left'|'right'
    onRetry?:()=>void
    onContinue?:()=>void
    manual?:boolean
    className?:string
}

export function MascotPeek(props:MascotPeekProps){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <Peek {...props}/>
}

function Peek({surface,facts,side='right',onRetry,onContinue,manual,className}:MascotPeekProps){
    const fromLeft=side==='left'

    return(
        <div
            className={cn(
                'pointer-events-none fixed bottom-24 z-30 flex flex-col gap-3',
                fromLeft? 'left-0 items-start' : 'right-0 items-end',
                className,
            )}
        >
            <GuideSlot
                surface={surface}
                facts={facts}
                onRetry={onRetry}
                onContinue={onContinue}
                manual={manual}
                variant="bubble"
                bubbleTail={side}
                showAvatar={false}
                className={cn('pointer-events-auto',fromLeft? 'ml-3' : 'mr-3')}
            />

            <div className={cn('w-20 overflow-hidden',fromLeft? 'rounded-r-3xl' : 'rounded-l-3xl')}>
                <div className={fromLeft? '-translate-x-6 rotate-[14deg]' : 'translate-x-6 -rotate-[14deg]'}>
                    <GuidanceMascot className="size-28"/>
                </div>
            </div>
        </div>
    )
}