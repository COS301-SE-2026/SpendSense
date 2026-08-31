import { cn } from "@/lib/utils"
import { initialsFromName } from "@/features/friends/friendsTypes"

//friend avatar bubble

type AvatarSize = "sm" | "md" | "lg" | "xl"

const tones = [
	"bg-[#FCE0E8] text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]",
	"bg-[#FFE7AE] text-[#7A4A00] dark:bg-[#3f2e00] dark:text-[#ffd166]",
	"bg-[#D7DEE4] text-[#3E4A55] dark:bg-[#1c263c] dark:text-[#dae2fd]",
	"bg-[#DCEFE8] text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]",
	"bg-[#DCE8F7] text-[#1E4FAE] dark:bg-[#1e293b] dark:text-[#dae2fd]",
	"bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]",
]

const sizeStyles: Record<AvatarSize, string> = {
	sm: "size-9 text-[11px]",
	md: "size-11 text-xs",
	lg: "size-14 text-sm",
	xl: "size-20 text-xl",
}

//one tone per person, so a friend is the same colour on every page
function toneForName(displayName: string) {
	let hash = 0
	for (let i = 0; i < displayName.length; i += 1) {
		hash = (hash * 31 + displayName.charCodeAt(i)) % 997
	}
	return tones[hash % tones.length]
}

export function FriendAvatar({
	displayName,
	avatarUrl,
	size = "md",
	className,
}: Readonly<{
	displayName?: string | null
	avatarUrl?: string | null
	size?: AvatarSize
	className?: string
}>) {
	const safeDisplayName = displayName?.trim() || "Unknown user"
	const base = cn(
		"flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#091828] font-bold dark:border-[#2d3449]",
		sizeStyles[size],
		className,
	)

	if (avatarUrl) {
		return <img src={avatarUrl} alt={safeDisplayName} className={cn(base, "object-cover")} />
	}

	return (
		<div className={cn(base, toneForName(safeDisplayName))} aria-hidden="true">
			{initialsFromName(safeDisplayName)}
		</div>
	)
}
