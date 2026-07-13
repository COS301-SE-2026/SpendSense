import * as React from "react"
import {useNavigate} from "react-router-dom"
import {ArrowLeft} from "lucide-react"

//shared shell for profile sub pages

export function SubPageShell({
    title,
    subtitle,
    children,
}: Readonly<{
    title: string
    subtitle?: string
    children: React.ReactNode
}>){
    
    const navigate =useNavigate()
    return(
        <div className ="min-h-screen bg-[#F4FBF7] pb-24">
            <div className ="mx-auto w-full max-w-md px-5 pt-6">
                <header className ="flex items-center gap-3">
                    <button 
                        type ="button" 
                        aria-label="Back"
                        onClick={() => navigate(-1)}
                        className = "flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFD9E1] text-[#AC2A5D] transition hover:bg-[#FFB3C6] active:translate-y-px">

                            <ArrowLeft className="size-5"/>
                        </button>

                        <div className ="min-w-0">
                            <h1 className="text-2xl font-extrabold leading-tight text-[#091828]">{title}</h1>
                            {subtitle && <p className="text-sm text-[#6B6375]">{subtitle}</p>}
                        </div>

                </header>

                <div className="mt-6 flex flex-col gap-3">{children}</div>
            </div>
        </div>
    )
}