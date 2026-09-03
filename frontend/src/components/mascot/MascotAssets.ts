import type {CosmeticSlot} from "@/features/cosmetics/cosmeticsTypes"
import type {MascotMood} from "@/lib/mascot"
import mascotNeutral from "@/assets/mascot/mascot-neutral.svg"
import mascotHappy from "@/assets/mascot/mascot-happy.svg"
import mascotCelebrating from "@/assets/mascot/mascot-celebrating.svg"
import mascotSad from "@/assets/mascot/mascot-sad.svg"
import mascotStressed from "@/assets/mascot/mascot-stressed.svg"
import partyHat from "@/assets/mascot/hat-party.svg"
import medal from "@/assets/mascot/accessory-medal.svg"
import crossBodyBag from "@/assets/mascot/accessory-cross-body-bag.svg"
import bucketHat from "@/assets/mascot/hat-bucket.svg"
import sunglasses from "@/assets/mascot/hat-sunglasses.svg"
import crown from "@/assets/mascot/hat-crown.svg"
import hoodie from "@/assets/mascot/accessory-hoodie.svg"
import hoodieStore from "@/assets/mascot/accessory-hoodie-store.svg"

//ART REGISTRY: placeholder until the hand drawn mascot and cosmetics land.
//only file that needs to change when the artwork arrives

/*HOW TO ADD THE ARTWORK
1. Put the files in frontend/src/assets/mascot/ (png with transparency, or svg).
Suggested naming: mascot-happy.png, hat-crown.png, accessory-scarf.png
2. Import them at the top of this file:
    import mascotHappy from "@/assets/mascot/mascot-happy.png"
    import crown from "@/assets/mascot/hat-crown.png"
3. Add them to the maps below, keyed by mood and by cosmetic code.
4. Nothing else changes. No component edits, no layout edits.
*/

//base mascot art, one per mood. empty until drawings are done
export const MASCOT_BASE_ART: Partial<Record<MascotMood, string>> = {
    NEUTRAL: mascotNeutral,
    HAPPY: mascotHappy,
    CELEBRATING: mascotCelebrating,
    SAD: mascotSad,
    STRESSED: mascotStressed,
}

//cosmetic overlay art, keyed by the item's 'code' from GET /cosmetics
export const COSMETIC_ART: Record<string, string> = {
    party_hat: partyHat,
    medal: medal,
    cross_body_bag: crossBodyBag,
    bucket_hat: bucketHat,
    sunglasses: sunglasses,
    crown: crown,
    hoodie: hoodie,
}

export const COSMETIC_STORE_ART: Record<string, string> = {
    hoodie: hoodieStore,
}

export const SLOT_LAYER_ORDER: Record<CosmeticSlot, number> = {
    ACCESSORY: 10,
    HAT: 20,
}

export function mascotBaseArtFor(mood: MascotMood): string | null{
    return MASCOT_BASE_ART[mood] ?? MASCOT_BASE_ART.NEUTRAL ?? null
}

export function cosmeticArtFor(code: string | null | undefined): string | null{
    if(!code) return null
    return COSMETIC_ART[code] ?? null
}

export function cosmeticStoreArtFor(
    code: string | null | undefined,
): string | null {
    if (!code) return null

    return COSMETIC_STORE_ART[code] ??
        COSMETIC_ART[code] ??
        null
}

export function hasMascotArt(): boolean{
    return Object.keys(MASCOT_BASE_ART).length > 0
}