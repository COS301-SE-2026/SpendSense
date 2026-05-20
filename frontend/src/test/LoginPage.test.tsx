import {render,screen,fireEvent,waitFor} from "@testing-library/react";
import {describe,it,expect,vi,beforeEach} from "vitest";
import LoginPage from "../domains/LoginPage";
import {signIn} from "../features/auth/auth.service";

vi.mock("@/features/auth/auth.service",()=>({
    signIn:vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom",()=>({
    ...vi.importActual("react-router-dom"),
    useNavigate:()=>mockNavigate,
    Link:({children,to}:{children:React.ReactNode; to:string})=><a href={to}>{children}</a>,
}));

describe("LoginPage Component",()=>{
    beforeEach(()=>{
        vi.clearAllMocks();
    });

    it("should display validation errors when fields are empty and submitted", async () => {
        render(<LoginPage />);
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
        expect(await screen.findByText(/password must be at least 6 characters/i)).toBeInTheDocument();
        expect(signIn).not.toHaveBeenCalled();
    });

    it("should display an error message if Supabase login fails", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new Error("Invalid login credentials"));
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

    it("should successfully log in and navigate to the dashboard on valid credentials", async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ user: { email: "ally@tuks.co.za" }, session: {} } as any);
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("ally@tuks.co.za"), {
        target: { value: "ally@tuks.co.za" },
    });
    fireEvent.change(screen.getByPlaceholderText("SuperSecretPassword"), {
        target: { value: "ValidPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith("ally@tuks.co.za", "ValidPassword123");
    });
    expect(mockNavigate).toHaveBeenCalledWith("/domains/dashboard");
});
});
});