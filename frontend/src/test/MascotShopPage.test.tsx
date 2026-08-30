import * as React from "react"
import {describe, it, expect, vi, beforeEach} from "vitest"
import {render, screen, waitFor, within} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import {MemoryRouter} from "react-router-dom"
import MascotShopPage from "../domains/MascotShopPage"
import type {CosmeticItem} from "../features/cosmetics/cosmeticsTypes"


const {mockGetCosmetics, mockPurchase, mockEquip, mockUnequip} = vi.hoisted(() => ({
    mockGetCosmetics: vi.fn(),
    mockPurchase: vi.fn(),
    mockEquip: vi.fn(),
    mockUnequip: vi.fn(),
}))

vi.mock("@/features/cosmetics/cosmeticsApi", async () => {
    const actual = await vi.importActual<typeof import("../features/cosmetics/cosmeticsApi")>(
        "../features/cosmetics/cosmeticsApi"
    )
    return {
        ...actual,
        getCosmetics: mockGetCosmetics,
        purchaseCosmetic: mockPurchase,
        equipCosmetic: mockEquip,
        unequipCosmetic: mockUnequip,
    }
})

const {mockPublishCoinBalance} = vi.hoisted(() => ({mockPublishCoinBalance: vi.fn()}))
vi.mock("@/features/gamification/coinBalance", async () => {
    const actual = await vi.importActual<typeof import("../features/gamification/coinBalance")>(
        "../features/gamification/coinBalance"
    )
    return {...actual, publishCoinBalance: mockPublishCoinBalance}
})

const mockRefetchProfile = vi.fn()
vi.mock("@/hooks/useGamificationProfile", () => ({
    useGamificationProfile: () => ({
        profile: {
            coins: 4200,
            xp: 540,
            mascotLevel: 6,
            mascotMood: "HAPPY",
            paymentStreak: 12,
            longestStreak: 15,
            knowledgeStreak: 3,
            longestKnowledgeStreak: 8,
            badges: [],
        },
        loading: false,
        error: null,
        refetch: mockRefetchProfile,
    }),
}))

function crown(overrides: Partial<CosmeticItem> = {}): CosmeticItem{
    return {
        id: "f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c",
        code: "crown",
        name: "Crown",
        slot: "HAT",
        cost: 150,
        iconKey: "hat_crown",
        owned: false,
        equipped: false,
        ...overrides,
    }
}

function beanie(overrides: Partial<CosmeticItem> = {}): CosmeticItem{
    return {
        id: "e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b",
        code: "beanie",
        name: "Beanie",
        slot: "HAT",
        cost: 75,
        iconKey: "hat_beanie",
        owned: false,
        equipped: false,
        ...overrides,
    }
}

function scarf(overrides: Partial<CosmeticItem> = {}): CosmeticItem{
    return {
        id: "a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d",
        code: "scarf",
        name: "Scarf",
        slot: "ACCESSORY",
        cost: 50,
        iconKey: "acc_scarf",
        owned: false,
        equipped: false,
        ...overrides,
    }
}

function renderPage(initialPath = "/mascot/shop"){
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <MascotShopPage/>
        </MemoryRouter>
    )
}

describe("MascotShopPage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetCosmetics.mockResolvedValue({data: [crown(), beanie(), scarf()]})
    })

    it("renders the catalog returned by GET /cosmetics", async () => {
        renderPage()
        expect(await screen.findByText("Crown")).toBeInTheDocument()
        expect(screen.getByText("Beanie")).toBeInTheDocument()
        expect(screen.getByText("Scarf")).toBeInTheDocument()
    })

    it("shows the coin balance from the profile before any purchase", async () => {
        renderPage()
        await screen.findByText("Crown")
        expect(screen.getByLabelText("4200 coins")).toBeInTheDocument()
    })

    it("filters the catalog by slot", async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByText("Crown")
        await user.click(screen.getByRole("button", {name: "Accessories"}))
        expect(screen.getByText("Scarf")).toBeInTheDocument()
        expect(screen.queryByText("Crown")).not.toBeInTheDocument()
    })

    it("opens on the owned filter when the wardrobe entry point is used", async () => {
        renderPage("/mascot/shop?view=owned")
        expect(await screen.findByText(/wardrobe is empty/i)).toBeInTheDocument()
    })

    it("says the shop is empty when the catalog comes back with no items", async () => {
        mockGetCosmetics.mockResolvedValue({data: []})
        renderPage()
        expect(await screen.findByText(/shop is empty/i)).toBeInTheDocument()
    })

    it("equips an owned item and re-reads the catalog for the result", async () => {
        const user = userEvent.setup()
        mockGetCosmetics
            .mockResolvedValueOnce({data: [crown({owned: true})]})
            .mockResolvedValueOnce({data: [crown({owned: true, equipped: true})]})
        mockEquip.mockResolvedValue({
            data: {id: crown().id, slot: "HAT", equipped: true},
        })
        renderPage()
 
        await user.click(await screen.findByRole("button", {name: "Equip"}))
 
        expect(mockEquip).toHaveBeenCalledWith(crown().id)
        expect(await screen.findByText("Equipped")).toBeInTheDocument()
        expect(mockGetCosmetics).toHaveBeenCalledTimes(2)
    })

    it("reflects the server's one-equipped-per-slot result after equipping", async () => {
        const user = userEvent.setup()
        mockGetCosmetics
            .mockResolvedValueOnce({data: [crown({owned: true, equipped: true}), beanie({owned: true})]})
            .mockResolvedValueOnce({data: [crown({owned: true}), beanie({owned: true, equipped: true})]})
        mockEquip.mockResolvedValue({
            data: {id: beanie().id, slot: "HAT", equipped: true},
        })
        renderPage()
 
        await user.click(await screen.findByRole("button", {name: "Equip"}))
 
        await waitFor(() => {
            expect(screen.getAllByText("Equipped")).toHaveLength(1)
        })
        expect(screen.getByText("Owned")).toBeInTheDocument()
    })

    it("walks the buy, confirm, equip flow and publishes the returned coin balance", async () => {
        const user = userEvent.setup()
        mockGetCosmetics
            .mockResolvedValueOnce({data: [crown()]})
            .mockResolvedValueOnce({data: [crown({owned: true})]})
        mockPurchase.mockResolvedValue({
            data: {id: crown().id, code: "crown", owned: true, coinBalance: 4050},
        })
        renderPage()
 
        await user.click(await screen.findByRole("button", {name: /buy with coins/i}))
 
        const sheet = screen.getByRole("dialog")
        await user.click(within(sheet).getByRole("button", {name: /buy with coins/i}))
        expect(within(sheet).getByText("After purchase")).toBeInTheDocument()
 
        await user.click(within(sheet).getByRole("button", {name: /confirm purchase/i}))
 
        expect(mockPurchase).toHaveBeenCalledWith(crown().id)
        expect(await screen.findByText(/bought/i)).toBeInTheDocument()
        expect(mockPublishCoinBalance).toHaveBeenCalledWith(4050)
    })

    it("blocks a purchase the user cannot afford", async () => {
        mockGetCosmetics.mockResolvedValue({data: [crown({cost: 999999})]})
        renderPage()
        expect(await screen.findByRole("button", {name: /not enough coins/i})).toBeDisabled()
    })

    it("surfaces the server's message when a mutation returns 400", async () => {
        const user = userEvent.setup()
        mockGetCosmetics.mockResolvedValue({data: [crown({owned: true})]})
        mockEquip.mockRejectedValue(
            Object.assign(new Error("Item is not owned"), {statusCode: 400})
        )
        renderPage()
 
        await user.click(await screen.findByRole("button", {name: "Equip"}))
 
        expect(await screen.findByText("Item is not owned")).toBeInTheDocument()
    })

    it("uses the shared loading card while the catalog is in flight", async () => {
        renderPage()
        expect(screen.getByText("Loading the shop")).toBeInTheDocument()
        expect(await screen.findByText("Crown")).toBeInTheDocument()
    })

    it("surfaces a retry when the catalog fails to load", async () => {
        mockGetCosmetics.mockRejectedValue(
            Object.assign(new Error("Server exploded"), {statusCode: 500})
        )
        renderPage()
        expect(await screen.findByText("Server exploded")).toBeInTheDocument()
        expect(screen.getByRole("button", {name: /please try again/i})).toBeInTheDocument()
    })
})