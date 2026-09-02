import * as React from "react"
import {useNavigate} from "react-router-dom"
import {ChevronLeft} from "lucide-react"

//shared shell for profile sub pages

export function SubPageShell({
    title,
    subtitle,
    stickyHeader = false,
    children,
}: Readonly<{
    title: string
    subtitle?: string
    stickyHeader?: boolean
    children: React.ReactNode
}>){
    
    const navigate =useNavigate()
    return(
        <div className ="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
            <div className ="mx-auto w-full max-w-md px-5 pt-6">
                <header
                    data-sticky={stickyHeader}
                    className={
                        "flex items-center gap-3" +
                        (stickyHeader
                            ? " sticky top-0 z-20 -mx-5 -mt-6 bg-[#F4FBF7] px-5 pb-3 pt-6 dark:bg-[#0b1326]"
                            : "")
                    }>
                    <button 
                        type ="button" 
                        aria-label="Back"
                        onClick={() => navigate(-1)}
                        className = "flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#060e20]">

                            <ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]" />
                        </button>

                        <div className= "flex flex-1 items-center justify-center">
                            <div className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]" style={{transform: "rotate(-3deg)"}}>
                                <span className="text-base font-bold text-[#091828] dark:text-[#091828]">{title}</span>
                            </div>
                        </div>

                        <div aria-hidden="true" className="size-12 shrink-0"/>

                </header>

                {subtitle &&(
                    <p className="mt-3 text-center text-sm text-[#6B6375] dark:text-[#ddbfc5]">{subtitle}</p>
                )}

                <div className="mt-6 flex flex-col gap-3">{children}</div>
            </div>
        </div>
    )
}