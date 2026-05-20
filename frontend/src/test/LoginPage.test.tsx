import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "../domains/LoginPage";
import * as authService from "../features/auth/auth.service";

vi.mock("../features/auth/auth.service");

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
    ...vi.importActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("LoginPage Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    //checks the form from the clients side validation
    it("should display validation errors when fields are empty and submitted", async () => {
        render(<LoginPage />);
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
        expect(await screen.findByText(/password must be at least 6 characters/i)).toBeInTheDocument();
        expect(authService.signIn).not.toHaveBeenCalled();
    });
    //supabase server error
    it("should display an error message if Supabase login fails", async () => {
        vi.spyOn(authService, "signIn").mockRejectedValueOnce(new Error("Invalid login credentials"));
        render(<LoginPage />);
        fireEvent.change(screen.getByPlaceholderText("ally@tuks.co.za"), {
            target: { value: "wrong@tuks.co.za" },
        });
        fireEvent.change(screen.getByPlaceholderText("SuperSecretPassword"), {
            target: { value: "WrongPassword123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
    //authentication hook and redirect path mapping
    it("should successfully log in and navigate to the dashboard on valid credentials", async () => {
        vi.spyOn(authService, "signIn").mockResolvedValue({ 
            user: { email: "ally@tuks.co.za" },
            session: {}
        } as any);
        render(<LoginPage />);
        fireEvent.change(screen.getByPlaceholderText("ally@tuks.co.za"), {
            target: { value: "ally@tuks.co.za" },
        });
        fireEvent.change(screen.getByPlaceholderText("SuperSecretPassword"), {
            target: { value: "ValidPassword123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        await waitFor(() => {
            expect(authService.signIn).toHaveBeenCalledWith("ally@tuks.co.za", "ValidPassword123");
        });
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/domains/dashboard");
        });
    });
});