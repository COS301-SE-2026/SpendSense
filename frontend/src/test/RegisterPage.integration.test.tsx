/// <reference types="@testing-library/jest-dom" />
import React from "react";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import {describe, it, expect, vi, beforeEach} from "vitest";
import {MemoryRouter, Routes, Route} from "react-router-dom";
import RegisterPage from "../domains/RegisterPage";
import {supabase} from "../lib/supabase";
import {getToken} from "../lib/tokenStore";

const mockUserResponse = {
    ok: true,
    json: async() => ({
        data: {
            user: { id: "u1", email: "morgie@tuks.co.za", displayName: "Morgie Walrus" },
        },
    }),
} as Response;

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

function renderRegisterPage() {
    return render(
        <MemoryRouter initialEntries={["/register"]}>
            <Routes>
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<div>Login</div>} />
                <Route path="/onboarding" element={<div>Onboarding</div>} />
            </Routes>
        </MemoryRouter>
    );
}

function fillForm({
    displayName = "Morgie Walrus",
    email = "morgie@tuks.co.za",
    password = "SecurePass123",
    confirmPassword = "SecurePass123",
} = {}) {
    fireEvent.change(screen.getByPlaceholderText("Morgie Walrus"), {
        target: {value: displayName},
    });
    fireEvent.change(screen.getByPlaceholderText("morgie@tuks.co.za"), {
        target: {value: email},
    });
    const [passwordInput, confirmInput] = screen.getAllByPlaceholderText("SuperSecretPassword");
    fireEvent.change(passwordInput, { target: {value: password} });
    fireEvent.change(confirmInput, { target: {value: confirmPassword} });
}

function mockSuccessfulSignUp(mockToken = "mock.jwt.token") {
    vi.spyOn(supabase.auth, "signUp").mockResolvedValueOnce({
        data: {
            user: {email: "morgie@tuks.co.za"} as never,
            session: {access_token: mockToken} as never,
        },
        error: null,
    } as never);
    vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({
            ok: true,
            json: async() => ({data: {available: true}}),
        } as Response)
        .mockResolvedValueOnce(mockUserResponse);
}

describe("Register page integration", () => {
    it("navigates to onboarding and stores JWT after successful sign up", async() => {
        const mockToken = "mock.jwt.token";
        mockSuccessfulSignUp(mockToken);

        renderRegisterPage();
        fillForm();
        fireEvent.click(screen.getByRole("button", {name: /join the quest/i}));

        await waitFor(() => {
            expect(screen.getByText("Onboarding")).toBeInTheDocument();
        });
        expect(getToken()).toBe(mockToken);
    });

    it("calls GET /users/me to bootstrap the database record after successful sign up", async() => {
        mockSuccessfulSignUp();
        const fetchSpy = vi.spyOn(globalThis, "fetch");

        renderRegisterPage();
        fillForm();
        fireEvent.click(screen.getByRole("button", {name: /join the quest/i}));

        await waitFor(() => {
            expect(screen.getByText("Onboarding")).toBeInTheDocument();
        });

        const getMeCall = fetchSpy.mock.calls.find(([url]) =>
            String(url).includes("/users/me")
        );
        expect(getMeCall).toBeDefined();
    });

    it("shows a confirmation message when email verification is required", async() => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async() => ({data: {available: true}}),
        } as Response);
        vi.spyOn(supabase.auth, "signUp").mockResolvedValueOnce({
            data: {
                user: {email: "morgie@tuks.co.za"} as never,
                session: null,
            },
            error: null,
        } as never);

        renderRegisterPage();
        fillForm();
        fireEvent.click(screen.getByRole("button", {name: /join the quest/i}));

        await waitFor(() => {
            expect(
                screen.getByText("Check your email to confirm your account before signing in.")
            ).toBeInTheDocument();
        });
        expect(getToken()).toBeNull();
    });

    it("shows an error message and does not store a token when sign up fails", async() => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async() => ({data: {available: true}}),
        } as Response);
        vi.spyOn(supabase.auth, "signUp").mockRejectedValueOnce(
            new Error("Email already registered")
        );

        renderRegisterPage();
        fillForm();
        fireEvent.click(screen.getByRole("button", { name: /join the quest/i }));

        await waitFor(() => {
            expect(screen.getByText("Email already registered")).toBeInTheDocument();
        });
        expect(getToken()).toBeNull();
    });

    it("shows a validation error when passwords do not match and does not call signUp", async () => {
        const signUpSpy = vi.spyOn(supabase.auth, "signUp");

        renderRegisterPage();
        fillForm({ password: "SecurePass123", confirmPassword: "DifferentPass456" });
        fireEvent.click(screen.getByRole("button", {name: /join the quest/i}));

        await waitFor(() => {
            expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
        });
        expect(signUpSpy).not.toHaveBeenCalled();
    });

    it("passes the display name as metadata to Supabase on sign up", async () => {
        mockSuccessfulSignUp();
        const signUpSpy = vi.spyOn(supabase.auth, "signUp");

        renderRegisterPage();
        fillForm({ displayName: "Morgie Walrus" });
        fireEvent.click(screen.getByRole("button", {name: /join the quest/i}));

        await waitFor(() => {
            expect(screen.getByText("Onboarding")).toBeInTheDocument();
        });
        expect(signUpSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                options: {data: { display_name: "Morgie Walrus"} },
            })
        );
    });

    it("does not call Supabase when the display name is unavailable", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async() => ({data: {available: false}}),
        } as Response);
        const signUpSpy = vi.spyOn(supabase.auth, "signUp");

        renderRegisterPage();
        fillForm({ displayName: "Taken Name" });
        fireEvent.click(screen.getByRole("button", {name: /join the quest/i}));

        await waitFor(() => {
            expect(screen.getByText("That display name is already taken.")).toBeInTheDocument();
        });
        expect(signUpSpy).not.toHaveBeenCalled();
    });

    it("does not call Supabase when the display name contains prohibited language", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async() => ({data: {available: false, reason: "prohibited"}}),
        } as Response);
        const signUpSpy = vi.spyOn(supabase.auth, "signUp");

        renderRegisterPage();
        fillForm({ displayName: "Ash0le" });
        fireEvent.click(screen.getByRole("button", {name: /join the quest/i}));

        await waitFor(() => {
            expect(screen.getByText("This display name contains prohibited language.")).toBeInTheDocument();
        });
        expect(signUpSpy).not.toHaveBeenCalled();
    });

    it("navigates to the login page via the 'Log in' link", () => {
        renderRegisterPage();
        fireEvent.click(screen.getByRole("link", {name: /log in/i}));
        expect(screen.getByText("Login")).toBeInTheDocument();
    });
});
