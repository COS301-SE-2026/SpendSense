import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

//shared shell for friends sub pages

export function FriendsPageShell({
    title,
    subtitle,
    children,
}: Readonly<{
    title: string
    subtitle?: string
    children: React.ReactNode
}>) {
    const navigate = useNavigate()

    return(
        <div className="min-h-screen bg-[#F4FB7] pb-24">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className ="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Back"
                        onClick={() => navigate(-1)}
                        className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                            <ArrowLeft className="size-5 text-[#6E0034]" />
                    </button>

                    <div className= "flex flex-1 items-center justify-center">
                        <div className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828]" style={{transform: "rotate(-3deg)"}}>
                            <span className="text-base font-bold text-[#091828]">{title}</span>
                        </div>
                    </div>
                    <div aria-hidden="true" className="size-12 shrink-0" />
                </header>
                {subtitle && (
                    <p className="mt-4 text-center text-sm text-[#6B6375]">{subtitle}</p>
                )}
                <div className="mt-6 flex flex-col gap-4">{children}</div>
            </div>
        </div>
    )
}