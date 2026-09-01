import * as React from "react"
import {ArrowRight} from "lucide-react"
import { Button } from "@/components/ui/button"
import {cn} from "@/lib/utils"

type LongButtonVariant = "primaryDark" | "primaryPink" | "primaryMint" | "primaryYellow" | "outline" | "primaryPinkBorder"|"form"
type LongButtoneSize= "sm" | "md" | "lg"
type LongButtonProps=React.ComponentProps<typeof Button>&{
    LongVariant?: LongButtonVariant
    LongSize?: LongButtoneSize
    fullWidth?: boolean
    showArrow?: boolean
}

export function LongButton({
    children,
    LongVariant="primaryDark",
    LongSize="md",
    fullWidth=true,
    showArrow=true,
    asChild=false,
    className,
    ...props
}: LongButtonProps){
    const variantStyles: Record<LongButtonVariant,string> ={
        primaryPinkBorder: "bg-[#FF6B9D] text-[#700034] border-[#FF6B9D] shadow-[3px_4px_0_#0a1929] hover:bg-[#FF85B0] dark:shadow-[3px_4px_0_#060e20]",
        primaryDark: "bg-[#0a1929] text-white border-transparent hover:bg-[#17131f] dark:bg-[#1c263c] dark:border-[#2d3449] dark:hover:bg-[#2d3449]",
        primaryPink: "bg-[#ac2a5d] text-[#3a0d23] border-transparent hover:bg-[#f74f92] dark:bg-[#ff6b9d] dark:text-[#3a0d23] dark:hover:bg-[#ff85b0]",
        primaryMint: "bg-[#72cdbc] text-[#08060d] border-transparent hover:bg-[#65c4b2]",
        primaryYellow: "bg-[#ffdc8a] text-[#08060d] border-transparent hover:bg-[#ffd372]",
        outline: "bg-white text-[#08060d] border-[#0a1929] hover:bg-[#f4f3ec] shadow-[3px_4px_0_#0a1929] dark:bg-[#131b2e] dark:text-white dark:border-[#2d3449] dark:hover:bg-[#1c263c] dark:shadow-[3px_4px_0_#060e20]",
        form:"bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none dark:bg-[#131b2e] dark:text-[#a0aec0] dark:shadow-none",
    }
    const sizeStyles: Record<LongButtoneSize,string> ={
        sm: "h-9 px-5 text-xs",
        md: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
    }
    return(
        <Button
            asChild={asChild}
            className={cn(
                "rounded-full border-2 font-bold transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                fullWidth && "w-full",
                variantStyles[LongVariant],
                sizeStyles[LongSize],
                className
            )}{...props}
        >
            {asChild ? children : (
                <>
                    {children}
                    {showArrow && <ArrowRight className="ml-2 h-4 w-4"/>}
                </>
            )}
        </Button>
    )
}