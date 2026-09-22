import {RefreshCw,X} from 'lucide-react'
import {Link} from 'react-router-dom'
import {GuidanceMascot} from './GuidanceMascot'
import {cn} from '@/lib/utils'
import type {SelectedGuide} from '@/features/guidance/guidanceTypes'

export interface GuideCardProps{
    guide:SelectedGuide
    showAvatar?:boolean
    onDismiss?:(id:string)=>void
    onRetry?:()=>void
    onNavigate?:()=>void
    className?:string
}

export function GuideCard({
    guide,
    showAvatar=true,
    onDismiss,
    onRetry,
    onNavigate,
    className,
}:GuideCardProps){
    return(
        <aside
            role="status"
            aria-live="polite"
            data-guide-id={guide.id}
            data-guide-kind={guide.kind}
            className={cn(
                'flex items-start gap-3 rounded-2xl border-2 border-[#091828] bg-white p-4 shadow-[3px_4px_0_#091828]',
                'dark:border-[#2d3449] dark:bg-[#131b2e] dark:shadow-none',
                className,
            )}
        >
            {showAvatar && <GuidanceMascot/>}

            <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-[#091828] dark:text-[#dae2fd]">
                    {guide.text}
                </p>

                {guide.actions.length>0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {guide.actions.map((action)=>(
                            action.to
                                ? (
                                    <Link
                                        key={`${action.label}-${action.to}`}
                                        to={action.to}
                                        onClick={onNavigate}
                                        className="rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-3 py-1.5 text-xs font-bold text-[#3F001B] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"
                                    >
                                        {action.label}
                                    </Link>
                                )
                                : (
                                    <button
                                        key={action.label}
                                        type="button"
                                        onClick={onRetry}
                                        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#091828] bg-[#E8EFEC] px-3 py-1.5 text-xs font-bold text-[#091828] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#1c263c] dark:text-[#dae2fd]"
                                    >
                                        <RefreshCw aria-hidden="true" className="size-3"/>
                                        {action.label}
                                    </button>
                                )
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