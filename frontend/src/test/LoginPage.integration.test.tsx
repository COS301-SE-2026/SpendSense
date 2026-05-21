import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginPage from "../domains/LoginPage";
import { supabase } from "../lib/supabase";
import { getToken } from "../lib/tokenStore";
import { apiFetch } from "../lib/api";
import { signOut } from "../features/auth/auth.service";

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

function renderLoginPage() {
    return render(
        <MemoryRouter initialEntries={["/login"]}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/domains/dashboard" element={<div>Dashboard</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe("Login page integration", () => {
    it("stores the JWT in localStorage after a successful login", async () => {
        const mockToken = "mock.jwt.token";
        vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValueOnce({
            data: {
                user: { email: "ally@tuks.co.za" } as never,
                session: { access_token: mockToken } as never,
            },
            error: null,
        } as never);

        renderLoginPage();
        fireEvent.change(screen.getByPlaceholderText("ally@tuks.co.za"), {
            target: {value: "ally@tuks.co.za"},
        });
        fireEvent.change(screen.getByPlaceholderText("SuperSecretPassword"), {
            target: {value: "ValidPassword123"},
        });
        fireEvent.click(screen.getByRole("button", {name: /sign in/i}));

        await waitFor(() => {
            expect(screen.getByText("Dashboard")).toBeInTheDocument();
        });
        expect(getToken()).toBe(mockToken);
    });

    it("does not store a token when login fails", async () => {
        vi.spyOn(supabase.auth, "signInWithPassword").mockRejectedValueOnce(
            new Error("Invalid login credentials")
        );

        renderLoginPage();
        fireEvent.change(screen.getByPlaceholderText("ally@tuks.co.za"), {
            target: {value: "wrong@tuks.co.za"},
        });
        fireEvent.change(screen.getByPlaceholderText("SuperSecretPassword"), {
            target: {value: "WrongPassword123"},
        });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
        });
        expect(getToken()).toBeNull();
    });

    it("apiFetch attaches the stored JWT as a Bearer header", async () => {
        const mockToken = "stored.jwt.token";
        localStorage.setItem("spendsense_access_token", mockToken);

        const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: "123" }),
        } as Response);

        await apiFetch("/users/me");

        const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
        expect(headers["Authorization"]).toBe(`Bearer ${mockToken}`);
    });

    it("clears the JWT from localStorage on sign out", async () => {
        localStorage.setItem("spendsense_access_token", "some.token");
        vi.spyOn(supabase.auth, "signOut").mockResolvedValueOnce({ error: null });

        await signOut();

        expect(getToken()).toBeNull();
    });
});
