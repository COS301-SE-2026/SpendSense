import { cn } from "@/lib/utils"

export function FilterChips<T extends string>({
    options,
    active,
    onChange,
}: Readonly<{
    options: {key: T; label: string}[]
    active: T
    onChange: (key: T) => void
}>) {
    return(
        <div className="flex items-center gap-2">
			{options.map((option) => (
				<button
					key={option.key}
					type="button"
					onClick={() => onChange(option.key)}
					aria-pressed={active === option.key}
					className={cn(
						"rounded-full border-2 border-[#091828] px-3 py-1.5 text-xs font-bold transition dark:border-[#2d3449]",
						active === option.key
							? "bg-[#FF6B9D] text-[#6E0034] shadow-[2px_3px_0_#091828] dark:shadow-[2px_3px_0_#060e20]"
							: "bg-white text-[#6B6375] hover:text-[#091828] dark:bg-[#131b2e] dark:text-[#a0aec0] dark:hover:text-[#dae2fd]",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
    )
}