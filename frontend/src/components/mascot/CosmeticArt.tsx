import * as React from "react"
import {Crown, Glasses, Medal, PartyPopper, Shirt, Sparkles} from "lucide-react"
import {cn} from "@/lib/utils"
import {cosmeticArtFor} from "./MascotAssets"
import type {CosmeticSlot} from "@/features/cosmetics/cosmeticsTypes"
 
//thumbnail for a single cosmetic, used on shop cards and the item sheet.

const PLACEHOLDER_ICONS: Record<string, React.ReactNode> = {
	hat_party: <PartyPopper className="size-6" />,
	hat_beanie: <Shirt className="size-6" />,
	hat_crown: <Crown className="size-6" />,
	acc_scarf: <Shirt className="size-6" />,
	acc_sunglasses: <Glasses className="size-6" />,
	acc_medal: <Medal className="size-6" />,
}

const TONE_BY_SLOT: Record<CosmeticSlot, string> = {
	HAT: "bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#3f2e00] dark:text-[#ffd166]",
	ACCESSORY: "bg-[#DCEFE8] text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]",
}

const SIZE_MAP = {
	sm: "size-12 rounded-2xl",
	md: "size-16 rounded-2xl",
	lg: "size-24 rounded-3xl",
} as const

type CosmeticArtProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
	code: string
	slot: CosmeticSlot
	name: string
	iconKey?: string | null
	size?: keyof typeof SIZE_MAP
}

export function CosmeticArt({
    code,
    slot,
    name,
    iconKey,
    size="md",
    className,
    ...props
}: CosmeticArtProps){
    const art=cosmeticArtFor(code)
    const placeholder = (iconKey && PLACEHOLDER_ICONS[iconKey]) ?? <Sparkles className="size-6"/>

    return(
        <div
            data-slot="cosmetic-art"
            className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden",
                SIZE_MAP[size],
                art ? "bg-white dark:bg-[#1C263C]" : TONE_BY_SLOT[slot],
                className,
            )}
            {...props}
        >
            {art ? (
                <img src ={art} alt={name} className="size-full object-contain p-1"/>
            ) : (
                <span aria-hidden="true">{placeholder}</span>
            )}
        </div>
    )
}
