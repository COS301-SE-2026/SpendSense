import React from 'react'

interface SimulationPageShellProps {
  children: React.ReactNode
}

export function SimulationPageShell({
  children,
}: SimulationPageShellProps) {
  return (
    <main className="min-h-screen bg-[#F4FBF7] px-5 py-8 dark:bg-[#0b1326]">
      {children}
    </main>
  )
}