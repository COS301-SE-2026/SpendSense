import * as React from "react"
import { Slot } from "radix-ui"
import { HelpCircle } from "lucide-react"
import { cn, stickerVariants, type StickerVariants } from "@/lib/utils"

type StickerProps = React.ComponentProps<"div"> &
  StickerVariants & {
    asChild?: boolean
  }

  function Sticker({
  className,
  tone = "pink",
  shape = "circle",
  size = "md",
  state = "earned",
  tilt = "none",
  asChild = false,
  children,
  ...props
}: StickerProps) {
  const isLocked = state === "locked"
  const Comp = asChild ? Slot.Root : "div"
 
  const variantTone = isLocked ? undefined : tone
 
  return (
    <Comp
      data-slot="sticker"
      data-tone={tone}
      data-shape={shape}
      data-state={state}
      role="img"
      className={cn(
        stickerVariants({ tone: variantTone, shape, size, state, tilt }),
        className
      )}
      {...props}
    >
      {isLocked ? <HelpCircle aria-hidden="true" /> : children}
    </Comp>
  )
}
 
export { Sticker }