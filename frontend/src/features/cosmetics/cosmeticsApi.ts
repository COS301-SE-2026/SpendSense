import {apiFetch} from '../../lib/api'
import type {
    CosmeticItem,
    CosmeticsResponse,
    EquipResponse,
    PurchaseResponse,
} from './cosmeticsTypes'


// cosmeticsApi: catalog, purchase, equip, unequip
// GET    /cosmetics
// POST   /cosmetics/:id/purchase
// PATCH  /cosmetics/:id/equip
// PATCH  /cosmetics/:id/unequip

export async function getCosmetics(): Promise<CosmeticsResponse>{
    return apiFetch<CosmeticsResponse>('/cosmetics')
}

export async function purchaseCosmetic(id: string): Promise<PurchaseResponse>{
    return apiFetch<PurchaseResponse>(`/cosmetics/${id}/purchase`, {
        method: 'POST',
    })
}

export async function equipCosmetic(id: string): Promise<EquipResponse>{
    return apiFetch<EquipResponse>(`/cosmetics/${id}/equip`, {
        method: 'PATCH',
    })
}

export async function unequipCosmetic(id: string): Promise<EquipResponse>{
    return apiFetch<EquipResponse>(`/cosmetics/${id}/unequip`, {
        method: 'PATCH',
    })
}

export function cosmeticErrorMessage(error: unknown, fallback: string): string{
    if(error instanceof Error && error.message){
        return error.message
    }
    return fallback
}
 
export type {CosmeticItem}