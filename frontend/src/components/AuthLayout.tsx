import type { ReactNode } from "react";
import logo from "./SpendSenseLogoLight.svg";

type AuthLayoutProps = {
    children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F4FBF7] px-4 py-8 text-[#091828] dark:bg-[#0b1326] dark:text-white">
            <section className="mx-auto w-full max-w-md">
                <img src={logo} alt="SpendSense" className="mx-auto mb-6 h-auto w-[300px] max-w-full" />
                {children}
            </section>
        </main>
    );
}
