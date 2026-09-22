import {X} from 'lucide-react'
import {useCallback,useEffect,useRef} from 'react'
import type {KeyboardEvent as ReactKeyboardEvent} from 'react'
import {WALKTHROUGH_STEPS} from '@/features/guidance/guidanceCatalogue'
import {useGuidance,useGuidanceOptional} from '@/features/guidance/useGuidance'
import {WALKTHROUGH_MAX_STEP,WALKTHROUGH_STEP_COUNT} from '@/features/guidance/guidanceTypes'
import {cn} from '@/lib/utils'

export function GuidanceWalkthrough({className}:{className?:string}){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <WalkthroughPanel className={className}/>
}

export function GuidanceTourInvitation({className}:{className?:string}){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <TourInvitation className={className}/>
}

function WalkthroughPanel({className}:{className?:string}){
    const {
        state,
        walkthroughVisible,
        goToWalkthroughStep,
        skipWalkthrough,
        completeWalkthrough,
    }=useGuidance()

    const panelRef=useRef<HTMLDivElement|null>(null)
    const returnFocusTo=useRef<HTMLElement|null>(null)

    useEffect(()=>{
        if(walkthroughVisible){
            returnFocusTo.current=document.activeElement as HTMLElement|null
            panelRef.current?.focus()
            return
        }
        if(returnFocusTo.current?.isConnected) returnFocusTo.current.focus()
        returnFocusTo.current=null
    },[walkthroughVisible])

    const onKeyDown=useCallback((event:ReactKeyboardEvent<HTMLDivElement>)=>{
        if(event.key==='Escape'){
            event.stopPropagation()
            skipWalkthrough()
        }
    },[skipWalkthrough])

    if(!walkthroughVisible) return null

    const {currentStep}=state.walkthrough
    const step=WALKTHROUGH_STEPS[Math.min(currentStep,WALKTHROUGH_MAX_STEP)]
    const isLast=currentStep>=WALKTHROUGH_MAX_STEP

    return(
        <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="walkthrough-heading"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className={cn(
                'fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md rounded-2xl border-2 border-[#091828] bg-white p-4 shadow-[3px_4px_0_#091828]',
                'dark:border-[#2d3449] dark:bg-[#131b2e] dark:shadow-none',
                className,
            )}
        >
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#6B6375] dark:text-[#a0aec0]">
                        Step {currentStep+1} of {WALKTHROUGH_STEP_COUNT}: {step.screen}
                    </p>
                    <h2
                        id="walkthrough-heading"
                        aria-live="polite"
                        className="mt-1 text-sm leading-relaxed text-[#091828] dark:text-[#dae2fd]"
                    >
                        {step.prompt}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={skipWalkthrough}
                    aria-label="Close the tour"
                    className="shrink-0 rounded-full p-1 text-[#6B6375] hover:bg-[#E8EFEC] focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#a0aec0] dark:hover:bg-[#1c263c]"
                >
                    <X aria-hidden="true" className="size-4"/>
                </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
                <button
                    type="button"
                    onClick={skipWalkthrough}
                    className="rounded-full px-3 py-1.5 text-xs font-bold text-[#6B6375] focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#a0aec0]"
                >
                    Skip
                </button>

                <span className="flex-1"/>

                <button
                    type="button"
                    onClick={()=>goToWalkthroughStep(currentStep-1)}
                    disabled={currentStep===0}
                    className="rounded-full px-3 py-1.5 text-xs font-bold text-[#091828] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#dae2fd]"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={()=>(isLast? completeWalkthrough() : goToWalkthroughStep(currentStep+1))}
                    className="rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-3 py-1.5 text-xs font-bold text-[#3F001B] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"
                >
                    {isLast? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
    )
}

function TourInvitation({className}:{className?:string}){
    const {
        state,
        walkthroughVisible,
        startWalkthrough,
        resumeWalkthrough,
        skipWalkthrough,
    }=useGuidance()

    if(walkthroughVisible) return null

    const {status,currentStep}=state.walkthrough

    if(status==='NOT_STARTED'){
        return(
            <InvitationCard
                heading="Want a quick tour?"
                body="I'll take you through the dashboard, calendar, payments, quizzes and insights in five short steps."
                primaryLabel="Take the tour"
                onPrimary={startWalkthrough}
                onDecline={skipWalkthrough}
                className={className}
            />
        )
    }
    if(status==='IN_PROGRESS'){
        return(
            <InvitationCard
                heading="Your tour is paused"
                body={`You stopped at step ${currentStep+1} of ${WALKTHROUGH_STEP_COUNT}.`}
                primaryLabel="Resume the tour"
                onPrimary={resumeWalkthrough}
                onDecline={skipWalkthrough}
                className={className}
            />
        )
    }
    return null
}

interface InvitationCardProps{
    heading:string
    body:string
    primaryLabel:string
    onPrimary:()=>void
    onDecline:()=>void
    className?:string
}

function InvitationCard({
    heading,
    body,
    primaryLabel,
    onPrimary,
    onDecline,
    className,
}:InvitationCardProps){
    return(
        <aside
            className={cn(
                'rounded-2xl border-2 border-[#091828] bg-white p-4 dark:border-[#2d3449] dark:bg-[#131b2e]',
                className,
            )}
        >
            <h2 className="text-sm font-bold text-[#091828] dark:text-[#dae2fd]">{heading}</h2>
            <p className="mt-1 text-sm text-[#6B6375] dark:text-[#a0aec0]">{body}</p>
            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={onPrimary}
                    className="rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-3 py-1.5 text-xs font-bold text-[#3F001B] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"
                >
                    {primaryLabel}
                </button>
                <button
                    type="button"
                    onClick={onDecline}
                    className="rounded-full px-3 py-1.5 text-xs font-bold text-[#6B6375] focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#a0aec0]"
                >
                    Not now
                </button>
            </div>
        </aside>
    )
}