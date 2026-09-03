import {useCallback, useEffect, useState} from 'react'
import {
    cosmeticErrorMessage,
    equipCosmetic,
    getCosmetics,
    purchaseCosmetic,
    unequipCosmetic,
} from '@/features/cosmetics/cosmeticsApi'
import type {CosmeticItem} from '@/features/cosmetics/cosmeticsTypes'
import {publishCoinBalance} from '@/features/gamification/coinBalance'

interface UseCosmeticsReturn{
    items: CosmeticItem[]
    isLoading: boolean
    error: string | null
    pendingId: string | null
    actionError: string | null
    clearActionError: () => void
    reload: () => void
    purchase: (item: CosmeticItem) => Promise<boolean>
    equip: (item: CosmeticItem) => Promise<boolean>
    unequip: (item: CosmeticItem) => Promise<boolean>
}

function isAbortError(error: unknown){
    return error instanceof Error && error.name === "AbortError"
}

export function useCosmetics(): UseCosmeticsReturn{
    const [items, setItems] = useState<CosmeticItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)

    const load=useCallback(async(signal?: AbortSignal)=> {
        setIsLoading(true)
        setError(null)
        try{
            const response = await getCosmetics()
            const data = response?.data
            if(!Array.isArray(data)){
                throw new Error("Unexpected response shape from /cosmetics")
            }
            if(signal?.aborted) return
            setItems(data)
        }
        catch(err){
            if(isAbortError(err) || signal?.aborted) return
            setError(cosmeticErrorMessage(err, "The shop could not be loaded."))
            setItems([])
        }finally {
            if(!signal?.aborted){
                setIsLoading(false)
            }
        }
    }, [])

    useEffect(()=> {
        const controller = new AbortController()
        void Promise.resolve().then(()=> {
            void load(controller.signal)
        })
        return () => {
            controller.abort()
        }
    }, [load])

    const runMutation = useCallback(async(
        item: CosmeticItem,
        request: () => Promise<unknown>,
        failureMessage: string,
    ) => {
        setPendingId(item.id)
        setActionError(null)
        try{
            await request()
            await load()
            return true
        }
        catch(err){
            setActionError(cosmeticErrorMessage(err, failureMessage))
            return false
        }
        finally{
            setPendingId(null)
        }
    }, [load])

    const purchase = useCallback(async(item: CosmeticItem) => {
        return runMutation(
            item,
            async() => {
                const response = await purchaseCosmetic(item.id)
                const balance = response?.data?.coinBalance
                if(typeof balance === "number"){
                    publishCoinBalance(balance)
                }
            },
            "That purchase did not go through.",
        )
    }, [runMutation])

    const equip = useCallback(async(item: CosmeticItem) => {
        return runMutation(
            item,
            () => equipCosmetic(item.id),
            "That item could not be equipped.",
        )
    }, [runMutation])

    const unequip = useCallback(async(item: CosmeticItem) => {
        return runMutation(
            item,
            () => unequipCosmetic(item.id),
            "That item could not be taken off.",
        )
    }, [runMutation])

    return{
        items,
        isLoading,
        error,
        pendingId,
        actionError,
        clearActionError: () => setActionError(null),
        reload: () => void load(),
        purchase,
        equip,
        unequip,
    }
}