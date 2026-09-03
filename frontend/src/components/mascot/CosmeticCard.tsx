import {Check, Coins, Lock} from "lucide-react"
import {cn} from "@/lib/utils"
import {CustomCard} from "@/components/ui/CustomCard"
import {CosmeticArt} from "./CosmeticArt"
import type {CosmeticItem} from "@/features/cosmetics/cosmeticsTypes"

interface CosmeticCardProps {
	item: CosmeticItem
	coinBalance: number
	busy?: boolean
	onOpen: (item: CosmeticItem) => void
	onEquip: (item: CosmeticItem) => void
	onUnequip: (item: CosmeticItem) => void
}

export function CosmeticCard({
    item,
    coinBalance,
    busy=false,
    onOpen,
    onEquip,
    onUnequip,
}: CosmeticCardProps){
    const affordable = coinBalance >= item.cost
    let state= "locked"
    if(item.equipped) {
        state="equipped"
    } else if(item.owned){
        state="owned"
    }

    return(
        <CustomCard
            variant="navyBorder"
            size="sm"
            className={cn(
                "flex flex-col items-center",
                item.equipped && "border-[#AC2A5D] dark:border-[#FF6B9D]",
            )}
        >
            <button
                type="button"
                onClick={()=> onOpen(item)}
                data-state={state}
                className="flex flex-col items-center rounded-2xl"
                aria-label={`View ${item.name}`}
            >
                <div className="relative">
                    <CosmeticArt
                        code={item.code}
                        slot={item.slot}
                        name={item.name}
                        iconKey={item.iconKey}
                        size="lg"
                    />
                    {item.equipped && (
                        <span
                            aria-hidden="true"
                            className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-[#091828] bg-[#6FC9B0] text-[#08312A] dark:border-[#060E20]"
                        >
                            <Check className="size-3.5"/>
                        </span>
                    )}
                </div>

                <p className="mt-2 text-sm font-bold text-[#091828] dark:text-white">{item.name}</p>
                {item.owned ? (
                    <span className="mt-1 rounded-full bg-[#DCEFE8] px-2 py-0.5 text-[10px] font-bold text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]">
                        {item.equipped ? "Equipped" : "Owned"}
                    </span>
                ) : (
                    <span
                        className={cn(
                            "mt-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            affordable
                                ? "bg-[#FFDF9A] text-[#201600] dark:bg-[#3F2E00] dark:text-[#FFD166]"
                                : "bg-[#E8EFEC] text-[#6B6375] dark:bg-[#1C263C] dark:text-[#A0AEC0]",
                        )}
                    >
                        {affordable ? (
                            <Coins className="size-3" aria-hidden="true"/>
                        ) : (
                            <Lock className="size-3" aria-hidden="true"/>
                        )}
                        {item.cost}
                    </span>
                )}
            </button>

            <CardAction
                item={item}
                busy={busy}
                affordable={affordable}
                onOpen={onOpen}
                onEquip={onEquip}
                onUnequip={onUnequip}
            />
        </CustomCard>
    )
}
function CardAction({
    item,
    busy,
    affordable,
    onOpen,
    onEquip,
    onUnequip,
}: Readonly<{
    item: CosmeticItem
    busy: boolean
    affordable: boolean
    onOpen: (item: CosmeticItem) => void
    onEquip: (item: CosmeticItem) => void
    onUnequip: (item: CosmeticItem) => void
}>) {
    const base =
        "mt-3 w-full rounded-full border-2 border-[#091828] px-3 py-1.5 text-xs font-bold transition active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 dark:border-[#2D3449]"

    if(item.equipped){
        return(
            <button
                type="button"
                disabled={busy}
                onClick={()=> onUnequip(item)}
                className={cn(base, "bg-white text-[#6B6375] dark:bg-[#1C263C] dark:text=[#A0AEC0]")}
            >
                {busy ? "Removing..." : "Take off"}
            </button>
        )
    }

    if(item.owned) {
        return (
            <button
                type="button"
                disabled={busy}
                onClick={()=> onEquip(item)}
                className={cn(base, "bg-[#FF6B9D] text-[#6E0034] dark:bg-[#FFB1C5] dark:text-[#650030]")}
            >
                {busy ? "Equipping..." : "Equip"}
            </button>
        )
    }

    return(
        <button
            type="button"
            disabled={busy || !affordable}
            onClick={()=> onOpen(item)}
            className={cn(
                base,
                affordable
                    ? "bg-[#FFDF9A] text-[#201600] dark:bg-[#3f2e00] dark:text-[#ffd166]"
                    : "cursor-not-allowed bg-[#E8EFEC] text-[#6B6375] dark:bg-[#1c263c] dark:text-[#a0aec0]",
            )}
        >
            {affordable ? "Buy with coins" : "Not enough coins"}
        </button>
    )
}
