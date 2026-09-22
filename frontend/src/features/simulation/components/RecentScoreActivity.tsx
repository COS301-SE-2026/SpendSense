import { TrendingDown, TrendingUp } from 'lucide-react'
import type { SimulationScoreEntry } from '../types'

interface RecentScoreActivityProps {
  entries: SimulationScoreEntry[]
}

export function RecentScoreActivity({
  entries,
}: RecentScoreActivityProps) {
  const recentEntries = entries.slice(0, 4)

  return (
    <section className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
          Score
        </p>
        <h2 className="mt-1 text-2xl font-black text-[#091828] dark:text-white">
          Recent activity
        </h2>
      </div>
      <div className="mt-4">
        {recentEntries.length === 0 ? (
          <div className="rounded-2xl bg-[#F4FBF7] px-4 py-6 text-center dark:bg-[#1C263C]">
            <p className="text-sm font-semibold text-[#6B6375] dark:text-[#A0AEC0]">
              No score activity yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {recentEntries.map((entry) => {
              const positive = entry.delta >= 0
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 border-b border-[#D8E8E2] py-3 last:border-b-0"
                >
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${
                      positive
                        ? 'bg-[#E6F7F2] text-[#187A6C]'
                        : 'bg-[#FFD9E6] text-[#AC2A5D]'
                    }`}
                  >
                    {positive ? (
                      <TrendingUp className="size-4"/>
                    ) : (
                      <TrendingDown className="size-4"/>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#091828] dark:text-white">
                      {entry.reason}
                    </p>
                    <p className="mt-1 text-xs text-[#6B6375] dark:text-[#A0AEC0]">
                      Day {entry.day}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-black ${
                      positive
                        ? 'text-[#187A6C]'
                        : 'text-[#AC2A5D]'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {entry.delta}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}