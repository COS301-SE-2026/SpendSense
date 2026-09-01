import * as React from "react"
import {cn} from "@/lib/utils"
import {
    cosmeticArtFor, 
    mascotBaseArtFor, 
    SLOT_LAYER_ORDER
} from "./MascotAssets"
import type {MascotMood} from "@/lib/mascot"
import type {CosmeticSlot} from "@/features/cosmetics/cosmeticsTypes"
 

export interface MascotAvatarLayer{
    slot: CosmeticSlot
    code: string
    name?: string
}

const SIZE_MAP ={
    sm: "size-20",
    md: "size-36",
    lg: "size-56",
} as const

type MascotAvatarProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
    mood: MascotMood
    equipped?: MascotAvatarLayer[]
    size?: keyof typeof SIZE_MAP
}

export function MascotAvatar({
    mood,
    equipped=[],
    size="lg",
    className,
    ...props
}: MascotAvatarProps){
    const baseArt = mascotBaseArtFor(mood)
    const layers = [...equipped].sort(
        (a, b)=> SLOT_LAYER_ORDER[a.slot] - SLOT_LAYER_ORDER[b.slot]
    )
    const wearing = layers.map((layer)=> layer.name ?? layer.code)

    return(
        <div
            data-slot="mascot-avatar"
            data-mood={mood}
            role="img"
            aria-label={
                wearing.length > 0 
                    ? `Mascot feeling ${mood.toLowerCase()}, wearing ${wearing.join(" and ")}`
                    : `Mascot feeling ${mood.toLowerCase()}`
            }
            className={cn("relative shrink-0", SIZE_MAP[size], className)}
            {...props}
        >
            {baseArt ? (
                <img src={baseArt} alt="" className="absolute insert-0 size-full object-contain"/>

            ): (
                <MascotArtPlaceholder mood={mood} size={size}/>
            )}

            {layers.map((layer)=> {
                const art = cosmeticArtFor(layer.code)
                if(!art) return null
                return(
                    <img
                        key={layer.code}
                        src={art}
                        alt=""
                        className="absolute insert-0 size-full object-contain"
                        style={{zIndex: SLOT_LAYER_ORDER[layer.slot]}}
                    />
                )
            })}
        </div>
    )
}

function MascotArtPlaceholder({
    mood,
    size,
}:Readonly<{
    mood: MascotMood
    size: keyof typeof SIZE_MAP
}>){
    return(
        <div
            className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed",
                "border-[#A8B4AE] bg-white/60 text-[#6B6375]",
                "dark:border-[#2d3449] dark:bg-[#1c263c]/60 dark:text-[#a0aec0]"
            )}
        >
            <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                className={cn(size === "sm" ? "size-10" : "size-20", "opacity-70")}
            >

                <path d="M50 22 C50 14, 44 10, 38 10 C38 18, 43 22, 50 23 Z" fill="currentColor" opacity="0.45"/>

                <rect x="24" y="24" width="52" height="52" rx="22" fill="currentColor" opacity="0.18"/>

                <rect x="32" y="36" width="36" height="26" rx="13" fill="currentColor" opacity="0.35"/>
                <circle cx="43" cy="49" r="4" fill="#FFFFFF"/>
                <circle cx="57" cy="49" r="4" fill="#FFFFFF"/>
            </svg>
            {size !== "sm" && (
                <span className="px-3 text-center text-[10px] font-bold uppercase tracking-[0.14em]">
                    {mood.toLowerCase()} art in progress
                </span>
            )}
        </div>
    )
}