import {ArrowRight,RefreshCw,X} from 'lucide-react'
import {Link} from 'react-router-dom'
import {GuidanceMascot} from './GuidanceMascot'
import {cn} from '@/lib/utils'
import type {SelectedGuide} from '@/features/guidance/guidanceTypes'

export type GuideCardVariant='card'|'bubble'
export type GuideBubbleTail='left'|'right'

export interface GuideCardProps{
    guide:SelectedGuide
    variant?:GuideCardVariant
    bubbleTail?:GuideBubbleTail
    showAvatar?:boolean
    onDismiss?:(id:string)=>void
    onRetry?:()=>void
    onContinue?:()=>void
    onNavigate?:()=>void
    className?:string
}

export function GuideCard({
    guide,
    variant='card',
    bubbleTail='right',
    showAvatar=true,
    onDismiss,
    onRetry,
    onContinue,
    onNavigate,
    className,
}:Readonly<GuideCardProps>){
    const isBubble=variant==='bubble'

    return(
        <aside
            role="status"
            aria-live="polite"
            data-testid="guide-card"
            data-guide-id={guide.id}
            data-guide-kind={guide.kind}
            data-guide-variant={variant}
            className={cn(
                'flex items-start gap-3 border-2 border-[#091828] bg-white dark:border-[#2d3449] dark:bg-[#131b2e]',
                isBubble
                    ? [
                        'relative max-w-[20rem] rounded-2xl p-4',
                        'after:absolute after:-bottom-[9px] after:size-4 after:rotate-45',
                        'after:border-b-2 after:border-r-2 after:border-[#091828] after:bg-white',
                        'dark:after:border-[#2d3449] dark:after:bg-[#131b2e]',
                        bubbleTail==='left'? 'rounded-bl-sm after:left-8' : 'rounded-br-sm after:right-8',
                    ]
                    : 'rounded-2xl p-4 shadow-[3px_4px_0_#091828] dark:shadow-none',
                className,
            )}
        >
            {showAvatar && !isBubble && <GuidanceMascot/>}

            <div className="min-w-0 flex-1">
                <p
                    className={cn(
                        'leading-relaxed text-[#091828] dark:text-[#dae2fd]',
                        'text-sm',
                    )}
                >
                    {guide.text}
                </p>

                {guide.actions.length>0 && (
                    <div className={'mt-3 flex flex-wrap gap-2'}>
                        {guide.actions.map((action)=>(
                            <GuideAction
                                key={`${action.label}-${action.to ?? ''}`}
                                action={action}
                                onNavigate={onNavigate}
                                onContinue={onContinue}
                                onRetry={onRetry}
                            />
                        ))}
                    </div>
                )}
            </div>

            {guide.dismissible && onDismiss && (
                <button
                    type="button"
                    onClick={()=>onDismiss(guide.id)}
                    aria-label="Hide this tip"
                    className="shrink-0 rounded-full p-1 text-[#6B6375] hover:bg-[#E8EFEC] focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#a0aec0] dark:hover:bg-[#1c263c]"
                >
                    <X aria-hidden="true" className="size-4"/>
                </button>
            )}
        </aside>
    )
}

type GuideActionProps={
    action:SelectedGuide['actions'][number]
    onNavigate?:()=>void
    onContinue?:()=>void
    onRetry?:()=>void
}

function GuideAction({action,onNavigate,onContinue,onRetry}:Readonly<GuideActionProps>){
    if(action.to){
        return(
            <Link
                to={action.to}
                onClick={onNavigate}
                className="rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-3 py-1 text-xs font-bold text-[#3F001B] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"
            >
                {action.label}
            </Link>
        )
    }
    if(action.intent==='continue'){
        return(
            <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-3 py-1.5 text-xs font-bold text-[#3F001B] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"
            >
                {action.label}
                <ArrowRight aria-hidden="true" className="size-3"/>
            </button>
        )
    }
    return(
        <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#091828] bg-[#E8EFEC] px-3 py-1 text-xs font-bold text-[#091828] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#1c263c] dark:text-[#dae2fd]"
        >
            <RefreshCw aria-hidden="true" className="size-3"/>
            {action.label}
        </button>
    )
}
