export type CosmeticSlot = "HAT" | "ACCESSORY"

export const COSMETIC_SLOTS: CosmeticSlot[] = ["HAT", "ACCESSORY"]

export const COSMETIC_SLOT_LABELS: Record<CosmeticSlot, string>={
    HAT: "Hats",
    ACCESSORY: "Accessories",
}

export interface CosmeticItem{
    id: string
    code: string
    name: string
    slot: CosmeticSlot
    cost: number
    iconKey: string | null
    owned: boolean
    equipped: boolean
}

export interface EquippedCosmetic{
    slot: CosmeticSlot
    code: string
    iconKey: string | null
}

export interface CosmeticsResponse{
    data: CosmeticItem[]
}

export interface PurchaseResponse{
    data: {
        id: string
        code: string
        owned: boolean
        coinBalance: number
    }
}

export interface EquipResponse{
    data: {
        id: string
        slot: CosmeticSlot
        equipped: boolean
    }
}