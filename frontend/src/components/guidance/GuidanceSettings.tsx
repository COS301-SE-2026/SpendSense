import {useGuidance,useGuidanceOptional} from '@/features/guidance/useGuidance'
import {cn} from '@/lib/utils'

export function GuidanceSettings({className}:{className?:string}){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <GuidanceSettingsPanel className={className}/>
}

function GuidanceSettingsPanel({className}:{className?:string}){
    const {
        state,
        setTipsEnabled,
        setDailyExpansionEnabled,
        resetDismissedTips,
        replayWalkthrough,
    }=useGuidance()

    return(
        <section
            aria-labelledby="guidance-settings-heading"
            className={cn(
                'rounded-2xl border-2 border-[#091828] bg-white p-4 dark:border-[#2d3449] dark:bg-[#131b2e]',
                className,
            )}
        >
            <h2
                id="guidance-settings-heading"
                className="text-sm font-bold text-[#091828] dark:text-[#dae2fd]"
            >
                Mascot guidance
            </h2>

            <label className="mt-4 flex items-start gap-3 text-sm text-[#091828] dark:text-[#dae2fd]">
                <input
                    type="checkbox"
                    className="mt-0.5 size-4"
                    checked={state.tipsEnabled}
                    onChange={(event)=>setTipsEnabled(event.target.checked)}
                />
                <span>
                    Show tips from your mascot
                    <span className="block text-[#6B6375] dark:text-[#a0aec0]">
                        Turning these off keeps your hidden tips and tour progress.
                    </span>
                </span>
            </label>

            <label className="mt-3 flex items-start gap-3 text-sm text-[#091828] dark:text-[#dae2fd]">
                <input
                    type="checkbox"
                    className="mt-0.5 size-4"
                    checked={state.dailyExpansionEnabled}
                    onChange={(event)=>setDailyExpansionEnabled(event.target.checked)}
                />
                <span>
                    Open today&rsquo;s guide automatically on the dashboard
                    <span className="block text-[#6B6375] dark:text-[#a0aec0]">
                        Once a day. You can always open it yourself.
                    </span>
                </span>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={resetDismissedTips}
                    disabled={state.dismissedTipIds.length===0}
                    className="rounded-full border-2 border-[#091828] bg-[#E8EFEC] px-3 py-1.5 text-xs font-bold text-[#091828] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#1c263c] dark:text-[#dae2fd]"
                >
                    Show hidden tips again
                </button>
                <button
                    type="button"
                    onClick={replayWalkthrough}
                    className="rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-3 py-1.5 text-xs font-bold text-[#3F001B] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#2d3449] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]"
                >
                    Replay the tour
                </button>
            </div>

            <GuidanceSyncNotice className="mt-4"/>
        </section>
    )
}

export function GuidanceSyncNotice({className}:{className?:string}){
    const guidance=useGuidanceOptional()
    if(!guidance?.unsynced) return null
    return <SyncNotice className={className}/>
}

function SyncNotice({className}:{className?:string}){
    const {retrySync}=useGuidance()

    return(
        <p role="status" className={cn('text-sm text-[#6B6375] dark:text-[#a0aec0]',className)}>
            Your guidance settings have not been saved to your account yet. They still apply on this device.{' '}
            <button
                type="button"
                onClick={retrySync}
                className="font-bold text-[#AC2A5D] underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#ff6b9d]"
            >
                Try saving again
            </button>
        </p>
    )
}