import * as React from "react"
import {Badge} from "@/components/ui/badge";
import {cn, badgeVariants, type BadgeVariants} from "@/lib/utils"

interface CustomBadgeProps{
    children: React.ReactNode
    variant?:BadgeVariants["variant"]
    size?:BadgeVariants["size"]
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
