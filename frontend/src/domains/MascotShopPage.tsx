import * as React from "react"
import {Link, useSearchParams} from "react-router-dom"
import {Coins, ShoppingBag} from "lucide-react"
 
import {CustomCard} from "@/components/ui/CustomCard"
import {LongButton} from "@/components/common/LongButton"
import {SubPageShell} from "@/components/common/SubPageShell"
import {FilterChips} from "@/components/common/FilterChips"
import {EmptyCard, ErrorCard, LoadingCard} from "@/components/common/AsyncStates"
import {CosmeticArt} from "@/components/mascot/CosmeticArt"
import {CosmeticCard} from "@/components/mascot/CosmeticCard"
import {MascotHubNav} from "@/components/mascot/MascotHubNav"
import {COSMETIC_SLOT_LABELS, type CosmeticItem} from "@/features/cosmetics/cosmeticsTypes"
import {useCosmetics} from "@/hooks/useCosmetics"
import {useGamificationProfile} from "@/hooks/useGamificationProfile"
import {cn} from "@/lib/utils"

//shop and wardrobe

type CatalogFilter = "ALL" | "HAT" | "ACCESSORY" | "OWNED"
 
const FILTERS: {key: CatalogFilter; label: string}[] = [
	{key: "ALL", label: "All"},
	{key: "HAT", label: COSMETIC_SLOT_LABELS.HAT},
	{key: "ACCESSORY", label: COSMETIC_SLOT_LABELS.ACCESSORY},
	{key: "OWNED", label: "Owned"},
]

const FILTER_BY_VIEW: Record<string, CatalogFilter> = {
    hat: "HAT",
    accessory: "ACCESSORY",
    owned: "OWNED",
}

function parseFilter(view: string | null): CatalogFilter{
    if(!view) return "ALL"
    return FILTER_BY_VIEW[view.toLowerCase()] ?? "ALL"
}

type SheetStage = "detail" | "confirm" | "purchased"

export default function MascotShopPage(){
    const [searchParams, setSearchParams] = useSearchParams()

    const {profile} = useGamificationProfile()
    const {
		items,
		isLoading,
		error,
		pendingId,
		actionError,
		clearActionError,
		reload,
		purchase,
		equip,
		unequip,
	} = useCosmetics()

    const filter = parseFilter(searchParams.get("view"))
    const setFilter = (next: CatalogFilter) => {
        setSearchParams(next === "ALL" ? {} : {view: next.toLowerCase()}, {replace: true})
    }

    const [sheetItemId, setSheetItemId] = React.useState<string | null>(null)
	const [sheetStage, setSheetStage] = React.useState<SheetStage>("detail")
 
	const coinBalance = profile?.coins ?? 0
 
    const sheetItem = items.find((item) => item.id === sheetItemId) ?? null
 
	const visible = items.filter((item) => {
		if (filter === "ALL") return true
		if (filter === "OWNED") return item.owned
		return item.slot === filter
	})

    const ownedCount = items.filter((item) => item.owned).length
 
	const openSheet = (item: CosmeticItem) => {
		clearActionError()
		setSheetItemId(item.id)
		setSheetStage("detail")
	}
 
	const closeSheet = () => {
		setSheetItemId(null)
		setSheetStage("detail")
		clearActionError()
	}

    const handleConfirmPurchase = async () => {
		if (!sheetItem) return
		const ok = await purchase(sheetItem)
		if (ok) {
			setSheetStage("purchased")
		}
	}
 
	const handleEquip = async (item: CosmeticItem) => {
		const ok = await equip(item)
		if (ok && sheetItemId === item.id) {
			closeSheet()
		}
	}

    return(
        <SubPageShell title="Shop" subtitle="Spend the coins you have earned or wear something you own.">
            <div className="flex items-center justify-between gap-3">
				<FilterChips
					options={FILTERS.map((entry) => ({
						key: entry.key,
						label:
							entry.key === "OWNED" && ownedCount > 0
								? `${entry.label} (${ownedCount})`
								: entry.label,
					}))}
					active={filter}
					onChange={setFilter}
				/>
 
				<span
					aria-label={`${coinBalance} coins`}
					className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#091828] bg-[#FFDF9A] px-3 py-1.5 text-xs font-bold text-[#201600] shadow-[2px_3px_0_#091828] dark:border-[#2d3449] dark:bg-[#3F2E00] dark:text-[#FFD166] dark:shadow-[2px_3px_0_#060e20]"
				>
					<Coins className="size-3.5" aria-hidden="true" />
					{coinBalance.toLocaleString()}
				</span>
			</div>

            {actionError && <ErrorCard message={actionError} onRetry={clearActionError} />}
 
			{isLoading && <LoadingCard label="Loading the shop" />}
 
			{!isLoading && error && <ErrorCard message={error} onRetry={reload} />}

            {!isLoading && !error && visible.length === 0 && (
				<EmptyCard
					icon={<ShoppingBag className="size-5" />}
					title={emptyTitle(filter, items.length === 0)}
					description={emptyDescription(filter, items.length === 0)}
					action={
						filter === "OWNED" && items.length > 0 ? (
							<button
								type="button"
								onClick={() => setFilter("ALL")}
								className="rounded-full border-2 border-[#091828] bg-white px-3 py-1.5 text-xs font-bold text-[#091828] dark:border-[#2D3449] dark:bg-[#1C263C] dark:text-white"
							>
								Browse the shop
							</button>
						) : undefined
					}
				/>
			)}

            {!isLoading && visible.length > 0 && (
				<div className="grid grid-cols-2 gap-3">
					{visible.map((item) => (
						<CosmeticCard
							key={item.id}
							item={item}
							coinBalance={coinBalance}
							busy={pendingId === item.id}
							onOpen={openSheet}
							onEquip={(target) => void handleEquip(target)}
							onUnequip={(target) => void unequip(target)}
						/>
					))}
				</div>
			)}

            <MascotHubNav active={filter === "OWNED" ? "wardrobe" : "shop"} />

            <LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
				<Link to="/mascot">Back to Mascot Home</Link>
			</LongButton>
 
			{sheetItem && (
				<ItemSheet
					item={sheetItem}
					stage={sheetStage}
					coinBalance={coinBalance}
					busy={pendingId === sheetItem.id}
					onClose={closeSheet}
					onStartPurchase={() => setSheetStage("confirm")}
					onConfirmPurchase={() => void handleConfirmPurchase()}
					onEquip={() => void handleEquip(sheetItem)}
					onUnequip={() => void unequip(sheetItem)}
				/>
			)}
        </SubPageShell>
    )
}

function emptyTitle(filter: CatalogFilter, catalogEmpty: boolean) {
	if (catalogEmpty) return "The shop is empty"
	if (filter === "OWNED") return "Your wardrobe is empty"
	return "Nothing in this category"
}
 
function emptyDescription(filter: CatalogFilter, catalogEmpty: boolean) {
	if (catalogEmpty) return "No items are on sale right now. Check back soon."
	if (filter === "OWNED") return "Buy something in the shop and it lands here."
	return "Try another category."
}


function ItemSheet({
    item,
	stage,
	coinBalance,
	busy,
	onClose,
	onStartPurchase,
	onConfirmPurchase,
	onEquip,
	onUnequip,
}: Readonly<{
    item: CosmeticItem
	stage: SheetStage
	coinBalance: number
	busy: boolean
	onClose: () => void
	onStartPurchase: () => void
	onConfirmPurchase: () => void
	onEquip: () => void
	onUnequip: () => void
}>) {
    const affordable = coinBalance >= item.cost

    return(
        <div
            className="fixed inset-0 z-40 flex items-end bg-[#091828]/55 px-5 pb-6 pt-16 sm:items-center sm:justify-center sm:p-6 dark:bg-[#060E20]/75"
            onMouseDown={(event)=> {
                if(event.target === event.currentTarget && !busy){
                    onClose()
                }
            }}
        >
            <CustomCard
                variant="navyBorder"
                size="md"
                fullWidth={false}
                className= "w-full max-w-sm border-2 shadow-[6px_6px_0_#091828] dark:shadow-[6px_6px_0_#060e20]"
            >
                <div 
                    role="dialog"
					aria-modal="true"
					aria-labelledby="cosmetic-sheet-title"
				>
                    <div className="flex items-start gap-3">
						<CosmeticArt
							code={item.code}
							slot={item.slot}
							name={item.name}
							iconKey={item.iconKey}
							size="lg"
					    />
                        <div className="min-w-0 flex-1">
                            <h2
								id="cosmetic-sheet-title"
								className="text-lg font-extrabold text-[#091828] dark:text-white"
							>
								{item.name}
							</h2>
                            <span
								className={cn(
									"mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
									item.slot === "HAT"
										? "bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#3f2e00] dark:text-[#ffd166]"
										: "bg-[#DCEFE8] text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]",
								)}
							>
								{COSMETIC_SLOT_LABELS[item.slot]}
							</span>

                            <p className="mt-2 text-xs font-semibold text-[#6B6375] dark:text-[#a0aec0]">
								{item.owned ? "In your wardrobe" : `${item.cost} coins`}
							</p>
                        </div>
                    </div>

                    {stage === "confirm" && (
						<dl className="mt-4 rounded-xl border border-[#1F2D3D] px-4 py-3 dark:border-[#2d3449]">
							<SheetRow label="Price" value={`${item.cost} coins`} />
							<SheetRow label="Your coins" value={`${coinBalance} coins`} />
							<SheetRow
								label="After purchase"
								value={`${Math.max(0, coinBalance - item.cost)} coins`}
								emphasis
							/>
						</dl>
					)}

                    {stage === "purchased" && (
						<p className="mt-4 rounded-xl bg-[#DCEFE8] px-4 py-3 text-sm font-bold text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]">
							Bought. Put it on now or save it for later.
						</p>
					)}

                    <div className="mt-5 grid grid-cols-2 gap-3">
						<LongButton
							LongVariant="outline"
							LongSize="sm"
							showArrow={false}
							onClick={onClose}
							disabled={busy}
						>
							{stage === "purchased" ? "Maybe later" : "Close"}
						</LongButton>
                        <SheetPrimaryAction
							item={item}
							stage={stage}
							busy={busy}
							affordable={affordable}
							onStartPurchase={onStartPurchase}
							onConfirmPurchase={onConfirmPurchase}
							onEquip={onEquip}
							onUnequip={onUnequip}
						/>
					</div>
                </div>
            </CustomCard>
        </div>
    )
}

function SheetPrimaryAction({
    item,
	stage,
	busy,
	affordable,
	onStartPurchase,
	onConfirmPurchase,
	onEquip,
	onUnequip,
}: Readonly<{
    item: CosmeticItem
	stage: SheetStage
	busy: boolean
	affordable: boolean
	onStartPurchase: () => void
	onConfirmPurchase: () => void
	onEquip: () => void
	onUnequip: () => void
}>) {

    if (stage === "confirm") {
		return (
			<LongButton
				LongVariant="primaryPinkBorder"
				LongSize="sm"
				showArrow={false}
				onClick={onConfirmPurchase}
				disabled={busy || !affordable}
			>
				{busy ? "Buying..." : "Confirm purchase"}
			</LongButton>
		)
	}

    if (item.equipped) {
		return (
			<LongButton
				LongVariant="primaryPinkBorder"
				LongSize="sm"
				showArrow={false}
				onClick={onUnequip}
				disabled={busy}
			>
				{busy ? "Removing..." : "Take off"}
			</LongButton>
		)
	}

    if (item.owned) {
		return (
			<LongButton
				LongVariant="primaryPinkBorder"
				LongSize="sm"
				showArrow={false}
				onClick={onEquip}
				disabled={busy}
			>
				{busy ? "Equipping..." : "Equip"}
			</LongButton>
		)
	}

    return (
		<LongButton
			LongVariant="primaryPinkBorder"
			LongSize="sm"
			showArrow={false}
			onClick={onStartPurchase}
			disabled={busy || !affordable}
		>
			{affordable ? "Buy with coins" : "Not enough coins"}
		</LongButton>
	)
}

function SheetRow({
	label,
	value,
	emphasis,
}: Readonly<{
	label: string
	value: string
	emphasis?: boolean
}>) {
	return (
		<div className="flex items-baseline justify-between py-1">
			<dt className="text-xs font-semibold text-[#6B6375] dark:text-[#a0aec0]">{label}</dt>
			<dd
				className={cn(
					"text-xs font-bold",
					emphasis
						? "text-[#AC2A5D] dark:text-[#ff6b9d]"
						: "text-[#091828] dark:text-white",
				)}
			>
				{value}
			</dd>
		</div>
	)
}