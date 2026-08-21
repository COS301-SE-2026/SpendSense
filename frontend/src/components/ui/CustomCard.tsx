import * as React from "react"
import {cn} from "@/lib/utils"

type CardVariant="greenShaddow"|"navyShaddow"|"navyBorder"
type CardSize="sm"|"md"|"lg"
interface CustomCardProps{
    title?:string
    children?:React.ReactNode
    variant?:CardVariant
    size?:CardSize
    fullWidth?:boolean
    className?:string
}

export function CustomCard({
    title,
    children,
    variant="greenShaddow",
    size="md",
    fullWidth=true,
    className
}:CustomCardProps){
    const variantStyles:Record<CardVariant,string>={
        greenShaddow: "bg-white shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none dark:bg-[#131b2e]",
        navyShaddow: "bg-white shadow-[3px_4px_0_#1F2D3D] border border-[#1F2D3D] dark:bg-[#131b2e] dark:border-[#2d3449]",
        navyBorder:"bg-white border border-[#1F2D3D] dark:bg-[#131b2e] dark:border-[#2d3449]",
    }
    const sizeStyles: Record<CardSize,string>={
        sm: "p-4 min-h-[80px]",
        md: "p-6 min-h-[120px]",
        lg:"p-8 min-h-[160px]",
    }
    return(
        <div
            className={cn(
                "rounded-xl transition-transform active:translate-x-[2px] active:translate-y-[2px]",
                fullWidth && "w-full",
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
        >
            {title && <div className="font-bold text-lg mb-2">{title}</div>}
            {children}
        </div>
    )
}