import { formatPoints } from '../../features/simulation/presentation'
import type { SimulationScoreEntry } from '../../features/simulation/types'

interface RecentScoreActivityProps {
  entries: SimulationScoreEntry[]
}

export function RecentScoreActivity({
  entries,
}: RecentScoreActivityProps) {
  const latest = entries[0]
  const delta = latest ? Number(latest.pointsDelta) : 0
  const positive = delta >= 0

  return (
    <section
      aria-label="Recent score"
      className="flex items-center justify-between gap-3 rounded-2xl bg-[#E6F2EE] px-4 py-3 dark:bg-[#183B39]"
    >
      <h2 className="shrink-0 text-sm font-black text-[#091828] dark:text-white">
        Recent score
      </h2>
      {latest ? (
        <p
          className={`min-w-0 text-right text-sm font-black ${
            positive
              ? 'text-[#187A6C] dark:text-[#8FE0D2]'
              : 'text-[#AC2A5D] dark:text-[#FFB1C5]'
          }`}
        >
          <span>
            {positive ? '+' : ''}
            {formatPoints(latest.pointsDelta)}
          </span>{' '}
          <span>{latest.reason}</span>
        </p>
      ) : (
        <p className="text-sm text-[#6B6375] dark:text-[#A0AEC0]">
          No score activity yet.
        </p>
      )}
    </section>
  )
}
