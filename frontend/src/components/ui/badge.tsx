import * as React from "react"
import { Slot } from "radix-ui"
import { badgeVariants,type BadgeVariants } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.ComponentProps<"span">{
  variant?:BadgeVariants["variant"]
  size?:BadgeVariants["size"]
  asChild?:boolean
}

function Badge({
  className,
  variant = "xp",
  size="md",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant,size }), className)}
      {...props}
    />
  )
}

export { Badge }
