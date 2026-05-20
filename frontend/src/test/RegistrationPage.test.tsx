import React from "react"
import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {BrowserRouter} from "react-router-dom";
import {describe,it,expect,vi,beforeEach} from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers"
import RegisterPage from "../domains/RegisterPage";
import {signUp} from "../features/auth/auth.service";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
declare module "vitest" {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Assertion<T =any> extends jest.Matchers<void, T>, TestingLibraryMatchers<T, void> {}
}
expect.extend(matchers);



vi.mock("../features/auth/auth.service",()=>({
    signUp:vi.fn(),
}));

const mockNavigate=vi.fn();
vi.mock("react-router-dom",async ()=>{
    const actual=await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate:()=>mockNavigate,
   };
});

const renderComponent=()=>{
    return render(
        <BrowserRouter>
            <RegisterPage />
        </BrowserRouter>
    );
};

describe("RegisterPage Component",()=>{
    beforeEach(()=>{
        vi.clearAllMocks();
   });

    it("should render all form inputs,buttons, and matching static text labels",()=>{
        renderComponent();
        expect(screen.getByText("Create Account")).toBeInTheDocument();
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/join the quest/i})).toBeInTheDocument();
   });

    //validation rules
    it("should display validation errors when fields fail Zod schema requirements",async ()=>{
        renderComponent();
        const user=userEvent.setup();
        const submitButton=screen.getByRole("button",{name:/join the quest/i});
        await user.click(submitButton);
        //trigger Zod messages
        expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
        expect(await screen.findByText("Email is required.")).toBeInTheDocument();
   });

    it("should display an error message if the passwords do not match",async ()=>{
        renderComponent();
        const user=userEvent.setup();
        await user.type(screen.getByLabelText(/email address/i),"test@example.com");
        await user.type(screen.getByLabelText(/^password$/i),"SuperSecret123");
        await user.type(screen.getByLabelText(/confirm password/i),"DifferentSecret123");
        await user.click(screen.getByRole("button",{name:/join the quest/i}));
        expect(await screen.findByText("Passwords do no match")).toBeInTheDocument();
   });

    //path submission and reg
    it("should successfully call signUp and navigate to the dashboard with valid data",async ()=>{
        vi.mocked(signUp).mockResolvedValueOnce({ user: {} as unknown as import("@supabase/supabase-js").User, session: null });
        renderComponent();
        const user=userEvent.setup();
        //form fields
        await user.type(screen.getByLabelText(/full name/i),"Morgie Walrus");
        await user.type(screen.getByLabelText(/email address/i),"morgie@tuks.co.za");
        await user.type(screen.getByLabelText(/^password$/i),"Password123");
        await user.type(screen.getByLabelText(/confirm password/i),"Password123");
        await user.click(screen.getByRole("button",{name:/join the quest/i}));
        await waitFor(()=>{
            expect(signUp).toHaveBeenCalledWith("morgie@tuks.co.za","Password123");
            expect(mockNavigate).toHaveBeenCalledWith("/domains/dashboard");
       });
   });

    // path interation
    it("should catch auth exceptions and render backend errors inline",async ()=>{
        //Mock rejected promise representing custom API fails
        vi.mocked(signUp).mockRejectedValueOnce(new Error("Email already in use."));
        renderComponent();
        const user=userEvent.setup();
        await user.type(screen.getByLabelText(/full name/i),"Morgie Walrus");
        await user.type(screen.getByLabelText(/email address/i),"duplicate@tuks.co.za");
        await user.type(screen.getByLabelText(/^password$/i),"Password123");
        await user.type(screen.getByLabelText(/confirm password/i),"Password123");
        await user.click(screen.getByRole("button",{name:/join the quest/i}));
        expect(await screen.findByText("Email already in use.")).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
   });
});