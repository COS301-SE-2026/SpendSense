/// <reference types="@testing-library/jest-dom" />
import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {vi, describe, it, expect, beforeEach} from "vitest";
import {BrowserRouter} from "react-router-dom";
import ObligationForm from "../domains/ObligationForm";
import {useCalendarOccurrences} from "@/hooks/useCalendarOccurrences"
import {useUserProfile} from "@/hooks/useUserProfile"

const apiMocks = vi.hoisted(() => ({
	getCategories: vi.fn(),
	createObligation: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {...actual, useNavigate: () => mockNavigate};
});

vi.mock("../features/categories/categoriesApi", () => ({
	getCategories: apiMocks.getCategories,
}));

vi.mock("../features/obligations/obligationsApi", () => ({
	createObligation: apiMocks.createObligation,
}));

vi.mock("@/hooks/useUserProfile", () => ({
    useUserProfile: vi.fn(),
}))

vi.mock("@/hooks/useCalendarOccurrences", () => ({
    useCalendarOccurrences: vi.fn(),
}))

describe("ObligationForm Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiMocks.getCategories.mockResolvedValue({
			data: [
				{id: "cat_subscription", name: "Subscription", type: "OBLIGATION", iconKey: "repeat", colourKey: "purple", isDefault: true},
				{id: "cat_rent", name: "Rent", type: "OBLIGATION", iconKey: "home", colourKey: "blue", isDefault: true},
				{id: "cat_custom", name: "Custom", type: "OBLIGATION", iconKey: "circle", colourKey: "slate",  isDefault: true},
			],
		});
		apiMocks.createObligation.mockResolvedValue({
			data: {obligation: {id: "obl_1", name: "Gym Membership"}, generatedOccurrences: []},
		});
		vi.mocked(useUserProfile).mockReturnValue({
			user: {
				displayName: "TestUser",
				email: "testuser@example.com",
				avatarUrl: null,
				memberSince: "September 2026",
				monthlyBudget: 10000,
				level: 1,
				tier: "Building",
				coins: 0,
				paymentStreak: 0,
				preferences: null,
			},
			loading: false,
			error: null,
			refetch: vi.fn(),
		})
		vi.mocked(useCalendarOccurrences).mockReturnValue({
			occurrences: [],
			loading: false,
			error: null,
			displayMonth: 8,
			displayYear: 2026,
			goToPreviousMonth: vi.fn(),
			goToNextMonth: vi.fn(),
			refetch: vi.fn(),
		})
	});

	const renderComponent = () => render(<BrowserRouter><ObligationForm /></BrowserRouter>);

	it("renders all core form input elements correctly", async () => {
		renderComponent();
		expect(screen.getByRole("heading", {name: /new obligation/i})).toBeInTheDocument();
		expect(screen.getByLabelText(/what is this for\?/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
		expect(screen.getByRole("button", {name: /subs/i})).toBeInTheDocument();
		expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/total occurrences/i)).toBeInTheDocument();
		await waitFor(() => {
			expect(apiMocks.getCategories).toHaveBeenCalledWith("OBLIGATION");
		});
	});

	it("displays validation error messages when submitting empty required fields", async () => {
		renderComponent();
		await userEvent.click(screen.getByRole("button", {name: /log obligation/i}));
		await waitFor(() => {
			expect(screen.getByText(/name is required/i)).toBeInTheDocument();
			expect(screen.getByText(/amount must be greater than r0.00/i)).toBeInTheDocument();
		});
	});

	it("successfully updates fields and handles a clean submission flow", async () => {
		renderComponent();
		await userEvent.type(screen.getByLabelText(/what is this for\?/i), "Gym Membership");
		await userEvent.type(screen.getByLabelText(/description/i), "Monthly debit order fitness center");
		await userEvent.click(screen.getByRole("button", {name: /subs/i}));
		await userEvent.type(screen.getByLabelText(/amount/i), "450");
		await userEvent.selectOptions(screen.getByLabelText(/priority/i), "MEDIUM");
		await userEvent.selectOptions(screen.getByLabelText(/frequency/i), "MONTHLY");
		await userEvent.type(screen.getByLabelText(/total occurrences/i), "12");
		await userEvent.click(screen.getByRole("button", {name: /log obligation/i}));
		await waitFor(() => {
			expect(screen.getByText(/added new obligation!/i)).toBeInTheDocument();
			expect(screen.getByText(/\+10 xp/i)).toBeInTheDocument();
		});
		expect(apiMocks.createObligation).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Gym Membership",
				categoryId: "cat_subscription",
				type: "SUBSCRIPTION",
				amount: 450,
				currency: "ZAR",
				schedule: expect.objectContaining({
					frequency: "MONTHLY",
					interval: 1,
					dayOfMonth: expect.any(Number),
					totalOccurrences: null,
				}),
				reminders: {
					enabled: true,
					daysBefore: [3, 1],
					channels: ["IN_APP"],
				},
			})
		);
	});

	it("clears out form input allocations completely when clicking the clear input/refresh icon button", async () => {
		renderComponent();
		const nameInput = screen.getByLabelText(/what is this for\?/i);
		await userEvent.type(nameInput, "Netflix Subscription");
		expect(nameInput).toHaveValue("Netflix Subscription");
		await userEvent.click(screen.getByRole("button", {name: ""}));
		await waitFor(() => {
			expect(nameInput).toHaveValue("");
		});
	});

	it("collapses and safely reveals the notifications options visual view element depending on the Reminders toggle status", async () => {
		renderComponent();
		expect(screen.getByText(/notification channels:/i)).toBeInTheDocument();
		expect(screen.getByText(/in_app/i)).toBeInTheDocument();
		const toggleSwitch = screen.getByText(/reminders/i).closest("div")?.nextSibling as HTMLElement;
		if (!toggleSwitch) throw new Error("Switch wrapper not found");
		await userEvent.click(toggleSwitch);
		await waitFor(() => {
			expect(screen.queryByText(/notification channels:/i)).not.toBeInTheDocument();
		});
	});

	it("shows remaining monthly budget when making an obligation", async () => {
		vi.mocked(useCalendarOccurrences).mockReturnValue({
			occurrences: [
				{
					id: "occurrence-paid",
					dueDate: "2026-09-01T00:00:00.000Z",
					amountDue: 3500,
					currency: "ZAR",
					status: "PAID",
					sequenceNumber: 1,
					daysUntilDue: -1,
					riskLevel: "LOW",
					obligation: {
						id: "obligation-1",
						name: "Rent",
						type: "RENT",
						priority: "HIGH",
					},
					reminders: [],
				},
			],
			loading: false,
			error: null,
			displayMonth: 8,
			displayYear: 2026,
			goToPreviousMonth: vi.fn(),
			goToNextMonth: vi.fn(),
			refetch: vi.fn(),
		})

		renderComponent()
		expect(screen.getByText(/R.*6.?500/)).toBeInTheDocument()
		expect(screen.getByText(/R.*10.?000/)).toBeInTheDocument()
		expect(screen.getByText(/monthly budget left/i)).toBeInTheDocument()
	})

	it("total occurrences is needed for fixed installments", async () => {
		renderComponent()

		await waitFor(() => {
			expect(
				apiMocks.getCategories
			).toHaveBeenCalledWith("OBLIGATION")
		})
		await userEvent.click(
			screen.getByRole("button", {
				name: /subs/i,
			}),
		)
		await userEvent.type(
			screen.getByLabelText(/what is this for/i),
			"Laptop",
		)
		await userEvent.type(
			screen.getByLabelText(/amount/i),
			"1000",
		)

		const frequency = screen.getByLabelText(/frequency/i)
		await userEvent.selectOptions(
			frequency,
			"FIXED_INSTALLMENT",
		)
		expect(frequency).toHaveValue("FIXED_INSTALLMENT")

		await userEvent.click(
			screen.getByRole("button", {
				name: /log obligation/i,
			}),
		)

		expect(
			await screen.findByText(
				/total occurrences must be a positive whole number/i,
			),
		).toBeInTheDocument()
		expect(apiMocks.createObligation).not.toHaveBeenCalled()
	})

	it("submits the fixed installments with the total occurrences", async () => {
		renderComponent()

		await waitFor(() => {
			expect(
				apiMocks.getCategories
			).toHaveBeenCalledWith("OBLIGATION")
		})
		await userEvent.click(
			screen.getByRole("button", {
				name: /subs/i,
			}),
		)
		await userEvent.type(
			screen.getByLabelText(/what is this for/i),
			"Laptop",
		)
		await userEvent.type(
			screen.getByLabelText(/amount/i),
			"1000",
		)
		await userEvent.type(
			screen.getByLabelText(/total occurrences/i),
			"13",
		)

		const frequency = screen.getByLabelText(/frequency/i)
		await userEvent.selectOptions(
			frequency,
			"FIXED_INSTALLMENT",
		)
		expect(frequency).toHaveValue("FIXED_INSTALLMENT")

		await userEvent.click(
			screen.getByRole("button", {
				name: /log obligation/i,
			}),
		)

		await waitFor(() => {
			expect(
				apiMocks.createObligation,
			).toHaveBeenCalledWith(
				expect.objectContaining({
					schedule: expect.objectContaining({
						frequency: "FIXED_INSTALLMENT",
						totalOccurrences: 13,
					}),
				}),
			)
		})
	})
});
