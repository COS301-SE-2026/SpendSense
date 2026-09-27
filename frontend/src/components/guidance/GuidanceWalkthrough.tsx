import {ChevronsRight,X} from 'lucide-react'
import {useEffect,useRef} from 'react'
import {GuidanceMascot} from './GuidanceMascot'
import {TourSpotlight} from './TourSpotlight'
import {useSpotlightRect} from '@/hooks/useSpotlightRect'
import {WALKTHROUGH_STEPS} from '@/features/guidance/guidanceCatalogue'
import {useGuidance,useGuidanceOptional} from '@/features/guidance/useGuidance'
import {WALKTHROUGH_MAX_STEP,WALKTHROUGH_STEP_COUNT} from '@/features/guidance/guidanceTypes'
import {cn} from '@/lib/utils'

export function GuidanceWalkthrough({className}:Readonly<{className?:string}>){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <WalkthroughPanel className={className}/>
}

export function GuidanceTourInvitation({className}:Readonly<{className?:string}>){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <TourInvitation className={className}/>
}

function WalkthroughPanel({className}:Readonly<{className?:string}>){
    const {
        state,
        walkthroughVisible,
        walkthroughStop,
        nextWalkthroughStop,
        previousWalkthroughStop,
        goToWalkthroughStop,
        skipWalkthroughFeature,
        skipWalkthrough,
    }=useGuidance()

    const panelRef=useRef<HTMLDialogElement|null>(null)
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

    useEffect(()=>{
        if(!walkthroughVisible) return
        const onKeyDown=(event:KeyboardEvent)=>{
            if(event.key==='Escape'){
                event.stopPropagation()
                skipWalkthrough()
            }
        }
        document.addEventListener('keydown',onKeyDown)
        return ()=>document.removeEventListener('keydown',onKeyDown)
    },[walkthroughVisible,skipWalkthrough])

    const {currentStep}=state.walkthrough
    const step=WALKTHROUGH_STEPS[Math.min(currentStep,WALKTHROUGH_MAX_STEP)]
    const stopIndex=Math.min(walkthroughStop,step.stops.length-1)
    const stop=step.stops[stopIndex]
    const rect=useSpotlightRect(stop.target,walkthroughVisible)

    if(!walkthroughVisible) return null

    const isLastStop=currentStep>=WALKTHROUGH_MAX_STEP&&stopIndex===step.stops.length-1
    const isFirstStop=currentStep===0&&stopIndex===0
    const panelAtTop=rect!==null&&rect.top+rect.height/2>window.innerHeight/2

    return(
        <>
            <TourSpotlight rect={rect} target={stop.target}/>
            <dialog
                ref={panelRef}
                open
                aria-modal="false"
                aria-labelledby="walkthrough-heading"
                tabIndex={-1}
                className={cn(
                    'fixed inset-x-4 z-[56] m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-2 border-[#091828] bg-white p-4 shadow-[3px_4px_0_#091828]',
                    'dark:border-[#2d3449] dark:bg-[#131b2e] dark:shadow-none',
                    panelAtTop? 'top-4' : 'bottom-20',
                    className,
                )}
            >
                <div className="flex items-start gap-3">
                    <GuidanceMascot className="size-12"/>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#6B6375] dark:text-[#a0aec0]">
                            {step.screen} &middot; step {currentStep+1} of {WALKTHROUGH_STEP_COUNT}
                            {step.stops.length>1 && ` (${stopIndex+1}/${step.stops.length})`}
                        </p>
                        <h2
                            id="walkthrough-heading"
                            className="mt-1 text-sm font-bold text-[#091828] dark:text-[#dae2fd]"
                        >
                            {stop.title}
                        </h2>
                        <p aria-live="polite" className="mt-1 text-sm leading-relaxed text-[#091828] dark:text-[#dae2fd]">
                            {stop.body}
                        </p>
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

                <div className="mt-3 flex items-center gap-2">
                    {step.stops.length>1 && (
                        <div role="group" aria-label={`${step.screen} steps`} className="flex items-center">
                            {step.stops.map((entry,index)=>(
                                <button
                                    key={entry.title}
                                    type="button"
                                    onClick={()=>goToWalkthroughStop(index)}
                                    aria-label={`Go to step ${index+1}: ${entry.title}`}
                                    aria-current={index===stopIndex? 'step' : undefined}
                                    className="group flex size-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'rounded-full transition-all',
                                            index===stopIndex
                                                ? 'h-2 w-4 bg-[#AC2A5D] dark:bg-[#ff6b9d]'
                                                : 'size-2 bg-[#E3D5DA] group-hover:bg-[#FFB1C8] dark:bg-[#2d3449] dark:group-hover:bg-[#5a2d44]',
                                        )}
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    <span className="flex-1"/>

                    <button
                        type="button"
                        onClick={skipWalkthroughFeature}
                        className="flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold text-[#AC2A5D] hover:bg-[#FFF4F7] focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#ff6b9d] dark:hover:bg-[#2d1b2e]"
                    >
                        Skip {step.screen}
                        <ChevronsRight aria-hidden="true" className="size-3.5"/>
                    </button>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-[#E8E4F4] pt-3 dark:border-[#2d3449]">
                    <button
                        type="button"
                        onClick={skipWalkthrough}
                        className="rounded-full px-3 py-1.5 text-xs font-bold text-[#6B6375] focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#a0aec0]"
                    >
                        End tour
                    </button>

                    <span className="flex-1"/>

                    <button
                        type="button"
                        onClick={previousWalkthroughStop}
                        disabled={isFirstStop}
                        className="rounded-full px-3 py-1.5 text-xs font-bold text-[#091828] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#dae2fd]"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={nextWalkthroughStop}
                        className="rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-3 py-1.5 text-xs font-bold text-[#3F001B] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"
                    >
                        {isLastStop? 'Finish' : 'Next'}
                    </button>
                </div>
            </dialog>
        </>
    )
}

function TourInvitation({className}:Readonly<{className?:string}>){
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
}:Readonly<InvitationCardProps>){
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