export function SectionHeader({
	title,
	meta,
}: {
	title: string
	meta?: string
}) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<h2 className="text-lg font-extrabold text-[#091828] dark:text-white">{title}</h2>
			{meta && (
				<span className="text-xs font-medium text-[#6b6375] dark:text-[#a0aec0]">{meta}</span>
			)}
		</div>
	)
}