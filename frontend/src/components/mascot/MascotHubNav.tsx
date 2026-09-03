import * as React from "react"
import {Link} from "react-router-dom"
import {
    Home,
    Shirt,
    ShoppingBag,
} from "lucide-react"
import {cn} from "@/lib/utils"
import {CustomCard} from "@/components/ui/CustomCard"

export type MascotHubTab =
    | "room"
    | "customise"
    | "wardrobe"
    | "shop"
    | "poses"
    | "inventory"
    | "mood"

interface HubItem {
    key: MascotHubTab
    label: string
    icon: React.ReactNode
    to?: string
    enabled: boolean
}

const HUB_ITEMS: HubItem[] = [
    {key: "room", label: "Room", icon: <Home className="size-5"/>, to: "/mascot", enabled: true},
    {
        key: "wardrobe",
        label: "Wardrobe",
        icon: <Shirt className="size-5"/>,
        to:"/mascot/shop?view=owned",
        enabled: true,
    },
    {
        key: "shop",
		label: "Shop",
		icon: <ShoppingBag className="size-5" />,
		to: "/mascot/shop",
		enabled: true,
	},
	/*{key: "customise", label: "Customise", icon: <Palette className="size-5" />, enabled: false},
	{key: "poses", label: "Poses", icon: <Smile className="size-5" />, enabled: false},
	{key: "inventory", label: "Inventory", icon: <Package className="size-5" />, enabled: false},
	{key: "mood", label: "Mood", icon: <Heart className="size-5" />, enabled: false},*/
]

export function MascotHubNav({active}: Readonly<{active: MascotHubTab}>){
    return(
        <CustomCard variant = "navyBorder" size="sm" className="p-2">
            <nav aria-label="Mascot Hub">
                <ul className="flex items-center gap-1 overflow-x-auto">
                    {HUB_ITEMS.map((item)=> (
                        <li key={item.key} className="shrink-0">
                            <HubNavItem item ={item} active={active === item.key}/>
                        </li>
                    ))}
                </ul>
            </nav>

{/*
            <p className="mt-1 px-2 text-[10px] font-semibold text-[#6B6375] dark:text-[#A0AEC0]">
                Customise, Poses, Inventory and Mood open up later.
            </p>
*/}
        </CustomCard>
    )
}

function HubNavItem({item, active}: Readonly<{item: HubItem; active: boolean}>){
    const content=(
        <>
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
        </>
    )

    const classes= cn(
        "flex w-[74px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition",
		active
			? "bg-[#FFD8E6] text-[#AC2A5D] dark:bg-[#3f1b2c] dark:text-[#ff6b9d]"
			: "text-[#6B6375] hover:text-[#091828] dark:text-[#a0aec0] dark:hover:text-[#dae2fd]",
    )

    if(!item.enabled || !item.to){
        return(
            <span
                aria-disabled="true"
                title="Coming soon!"
                className={cn(classes, "cursor-not-allowed select-none opacity-35")}
            >
                {content}
            </span>
        )
    }

    return(
        <Link to={item.to} aria-current={active ? "page" : undefined} className={classes}>
            {content}
        </Link>
    )
}