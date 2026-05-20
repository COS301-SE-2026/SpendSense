import * as React from "react"
import {Badge} from "@/components/ui/badge";
import {badgeVariants, cn} from "@/lib/utils"

type BadgeVariant="xp"|"tier"|"streak"|"level"
type BadgeSize="sm"|"md"|"lg"

interface CustomBadgeProps{
    children: React.ReactNode
    variant?:BadgeVariant
    size?:BadgeSize
    className?:string
}

export function CustomBadge({
    children,
    variant,
    size,
    className,
}:CustomBadgeProps){
    return(
        <Badge
            className={cn(
                badgeVariants({variant,size}),
                className
            )}
        >
            {children}
        </Badge>
    )
}
