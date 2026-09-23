import {CustomCard} from '@/components/ui/CustomCard'
import {LongButton} from '@/components/common/LongButton'
import {Toggle} from '@/components/common/Toggle'
import {useGuidance,useGuidanceOptional} from '@/features/guidance/useGuidance'
import {cn} from '@/lib/utils'

export function GuidanceSettings({className}:Readonly<{className?:string}>){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <GuidanceSettingsCard className={className}/>
}

function GuidanceSettingsCard({className}:Readonly<{className?:string}>){
    const {
        state,
        setTipsEnabled,
        setDailyExpansionEnabled,
        resetDismissedTips,
        replayWalkthrough,
    }=useGuidance()

    return(
        <CustomCard
            variant="navyBorder"
            size="md"
            className={cn('dark:border-[#574146] dark:bg-[#171f33]',className)}
        >
            <div className="flex flex-col gap-5">
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#ddbfc5]">
                        Mascot Guidance
                    </p>

                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-[#6B6375] dark:text-[#ddbfc5]">
                            Show tips from your mascot
                        </p>
                        <Toggle
                            checked={state.tipsEnabled}
                            onChange={()=>setTipsEnabled(!state.tipsEnabled)}
                            label="Show tips from your mascot"
                        />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                        <p className="text-xs text-[#6B6375] dark:text-[#ddbfc5]">
                            Open today&rsquo;s guide automatically on the dashboard
                        </p>
                        <Toggle
                            checked={state.dailyExpansionEnabled}
                            onChange={()=>setDailyExpansionEnabled(!state.dailyExpansionEnabled)}
                            label="Open today's guide automatically on the dashboard"
                        />
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#ddbfc5]">
                        Guided Tour
                    </p>
                    <LongButton
                        LongVariant="primaryPinkBorder"
                        LongSize="sm"
                        showArrow={false}
                        onClick={replayWalkthrough}
                        className="dark:shadow-[3px_4px_0_#060e20]"
                    >
                        Start the tour
                    </LongButton>
                    <button
                        type="button"
                        onClick={resetDismissedTips}
                        disabled={state.dismissedTipIds.length===0}
                        className="mt-3 text-xs font-bold text-[#091828] underline disabled:opacity-40 dark:text-[#dae2fd]"
                    >
                        Show hidden tips again
                    </button>
                </div>

                <GuidanceSyncNotice/>
            </div>
        </CustomCard>
    )
}

export function GuidanceSyncNotice({className}:Readonly<{className?:string}>){
    const guidance=useGuidanceOptional()
    if(!guidance?.unsynced) return null
    return <SyncNotice className={className}/>
}

function SyncNotice({className}:Readonly<{className?:string}>){
    const {retrySync}=useGuidance()

    return(
        <p role="status" className={cn('text-center text-xs text-[#AC2A5D] dark:text-[#ffb4ab]',className)}>
            Your guidance settings are saved on this device but not to your account yet.{' '}
            <button
                type="button"
                onClick={retrySync}
                className="font-bold underline"
            >
                Try again
            </button>
        </p>
    )
}