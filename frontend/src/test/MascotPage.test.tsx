import * as React from "react"
import {describe, it, expect, vi, beforeEach} from "vitest"
import {render, screen} from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import {MemoryRouter} from "react-router-dom"
import MascotPage from "../domains/MascotPage"
import type {GamificationProfile} from "../hooks/useGamificationProfile"


const mockUseGamificationProfile = vi.fn()

vi.mock("@/hooks/useGamificationProfile", () => ({
    useGamificationProfile: () => mockUseGamificationProfile(),
}))

function baseProfile(overrides: Partial<GamificationProfile> = {}): GamificationProfile{
    return{
        coins: 4200,
		xp: 540,
		mascotLevel: 6,
		mascotMood: "HAPPY",
		paymentStreak: 12,
		longestStreak: 15,
		knowledgeStreak: 3,
		longestKnowledgeStreak: 8,
		badges: [],
		...overrides,
    }
}

function mockProfile(overrides: Partial<GamificationProfile> = {}) {
	mockUseGamificationProfile.mockReturnValue({
		profile: baseProfile(overrides),
		loading: false,
		error: null,
		refetch: vi.fn(),
	})
}

function renderPage() {
	return render(
		<MemoryRouter>
			<MascotPage />
		</MemoryRouter>,
	)
}

describe("MascotPage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProfile()
    })

    it("replaces the coming soon placeholder", () => {
		renderPage()
		expect(screen.getByText("Mascot Home")).toBeInTheDocument()
		expect(screen.queryByText(/mascot coming soon/i)).not.toBeInTheDocument()
	})

    it("shows level, mood and coin balance from the profile", () => {
		renderPage()
		expect(screen.getByText("Level 6")).toBeInTheDocument()
		expect(screen.getByText("Happy")).toBeInTheDocument()
		expect(screen.getByText("4,200")).toBeInTheDocument()
	})

    it("shows only fields the profile actually returns, no invented mood score", () => {
		renderPage()
		expect(screen.getByText("Mascot level")).toBeInTheDocument()
		expect(screen.queryByText(/budget apprentice/i)).not.toBeInTheDocument()
	})

    it("computes level progress client side when mascotLevelProgress is absent", () => {
		renderPage()
		expect(screen.getByText("40 / 100 XP")).toBeInTheDocument()
		expect(screen.getByText("Progress to level 7")).toBeInTheDocument()
	})

    it("prefers mascotLevelProgress once the backend sends it", () => {
		mockProfile({
			mascotLevelProgress: {currentLevelXp: 75, xpForNextLevel: 100, percentToNextLevel: 75},
		})
		renderPage()
		expect(screen.getByText("75 / 100 XP")).toBeInTheDocument()
	})

    it("omits the mood reason line while the field is absent", () => {
		renderPage()
		expect(screen.queryByText(/paid .* on time/i)).not.toBeInTheDocument()
	})

    it("shows the mood reason once the backend sends it", () => {
		mockProfile({moodReason: "You paid Rent on time."})
		renderPage()
		expect(screen.getByText("You paid Rent on time.")).toBeInTheDocument()
	})

    it("renders the mascot bare when equippedCosmetics is absent", () => {
		renderPage()
		expect(screen.getByRole("img", {name: /mascot feeling happy$/i})).toBeInTheDocument()
	})

    it("describes equipped cosmetics on the mascot once they exist", () => {
		mockProfile({
			equippedCosmetics: [{slot: "HAT", code: "crown", iconKey: "hat_crown"}],
		})
		renderPage()
		expect(screen.getByRole("img", {name: /wearing crown/i})).toBeInTheDocument()
		expect(screen.getByText(/wearing crown/i)).toBeInTheDocument()
	})

    it("shows both streaks and the sticker count as stat tiles", () => {
		renderPage()
		expect(screen.getByText("Day streak")).toBeInTheDocument()
		expect(screen.getByText("12")).toBeInTheDocument()
		expect(screen.getByText("Quiz streak")).toBeInTheDocument()
		expect(screen.getByText("Stickers")).toBeInTheDocument()
	})

    it("links to the shop and back to the profile", () => {
		renderPage()
		expect(screen.getByRole("link", {name: /open the shop/i})).toHaveAttribute(
			"href",
			"/mascot/shop",
		)
		expect(screen.getByRole("link", {name: /back to profile/i})).toHaveAttribute("href", "/profile")
	})

    it("keeps the stretch hub tabs visible but disabled", () => {
		renderPage()
		expect(screen.getByRole("link", {name: /wardrobe/i})).toHaveAttribute(
			"href",
			"/mascot/shop?view=owned",
		)
		expect(screen.getByText("Poses").closest("[aria-disabled]")).toBeTruthy()
	})

    it("shows the shared loading card while the profile is in flight", () => {
		mockUseGamificationProfile.mockReturnValue({
			profile: null,
			loading: true,
			error: null,
			refetch: vi.fn(),
		})
		renderPage()
		expect(screen.getByText("Loading your mascot")).toBeInTheDocument()
	})

    it("offers a retry when the profile fails to load", () => {
		const refetch = vi.fn()
		mockUseGamificationProfile.mockReturnValue({
			profile: null,
			loading: false,
			error: "boom",
			refetch,
		})
		renderPage()
		expect(screen.getByText("boom")).toBeInTheDocument()
		expect(screen.getByRole("button", {name: /please try again/i})).toBeInTheDocument()
	})
})