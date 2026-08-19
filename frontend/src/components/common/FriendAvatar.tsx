import { cn } from "@/lib/utils"

export type AvatarTone =
    | "pink"
    | "blue"
    | "yellow"
    | "slate"
    | "mint"
    | "maroon"
    | "hotpink"

type AvatarSize = "sm" | "md" | "lg" | "xl"

const toneStyles: Record<AvatarTone, string> = {
    pink: "bg-[#FCE0E8] text-[#AC2A5D]",
    blue: "bg-[#DCE8F7] text-[#1E4FAE]",
    yellow: "bg-[#FFE7AE] text-[#7A4A00]",
	slate: "bg-[#D7DEE4] text-[#3E4A55]",
	mint: "bg-[#DCEFE8] text-[#16635A]",
    maroon: "bg-[#6E0034] text-[#FFFFFF]",
	hotpink: "bg-[#FF6B9D] text-[#700034]",
}

const sizeStyles: Record<AvatarSize, string> = {
    sm: "size-9 text-[11px]",
    md: "size-11 text-xs",
    lg: "size-14 text-sm",
    xl: "size-20 text-xl",
}

const dotStyles: Record<AvatarSize, string>={
    sm: "size-2.5",
    md: "size-3",
    lg: "size-3.5",
    xl: "size-4",
}

export function FriendAvatar({
    initials,
    tone= "pink",
    size= "md",
    online =false,
    className,
}: Readonly <{
    initials: string
    tone?: AvatarTone
    size?: AvatarSize
    online?: boolean
    className?: string
}>) {
    return(
        <div className={cn("relative shrink-0", className)}>
            <div className={cn("flex items-center justify-center rounded-full border-2 border-[#091828] font-bold", toneStyles[tone], sizeStyles[size])}>
                {initials}
            </div>

            {online && (
                <span aria-label="Online" className={cn("absolute bottom-0 right-0 rounded-full border-2 border-white bg-[#6FC9B0]", dotStyles[size])}/>
            )}
        </div>
    )
}