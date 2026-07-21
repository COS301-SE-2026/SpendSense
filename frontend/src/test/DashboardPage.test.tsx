<div className="mt-3 flex flex-col items-center gap-2">
    <CustomCard
        className="flex w-full max-w-[280px] flex-col items-center rounded-2xl bg-[#FFF4F7] p-4"
        data-testid="knowledge-streak"
    >
        <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375]">
            Knowledge streak
        </p>

        <StreakFlame
            days={knowledgeStreak}
            label="days"
            size="sm"
        />

        <StreakTicks
            total={7}
            completed={Array.from(
                {length:Math.min(knowledgeStreak,7)},
                (_,index)=>index,
            )}
            size="sm"
            aria-label={`${knowledgeStreak} day knowledge streak`}
        />
    </CustomCard>

    <div className="flex items-center justify-center gap-2">
        <CustomBadge variant="level" size="md">
            Lvl {level_}
        </CustomBadge>

        <Sticker tone="yellow" shape="squircle" size="sm" tilt="right">
            <span className="px-2 text-[10px] font-bold tracking-wide text-[#091828]">
                Early Bird
            </span>
        </Sticker>
    </div>
</div>