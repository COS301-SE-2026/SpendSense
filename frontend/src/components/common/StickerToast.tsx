import * as React from "react"
import { X, ChevronRight } from "lucide-react"
import {
  cn,
  stickerToastVariants,
  type StickerToastVariants,
  type StickerVariants,
} from "@/lib/utils"
import { Sticker } from "@/components/ui/sticker"
 
type StickerToastProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> &
  StickerToastVariants & {
    title?: string
    name: string
    description?: string
    stickerIcon?: React.ReactNode
    stickerTone?: StickerVariants["tone"]
    stickerShape?: StickerVariants["shape"]
    onView?: () => void
    onDismiss?: () => void
    viewLabel?: string
}

export function StickerToast({
  tone = "pink",
  title = "Sticker earned!",
  name,
  description,
  stickerIcon,
  stickerTone,
  stickerShape ="squircle",
  onView,
  onDismiss,
  viewLabel = "View",
  className,
  ...props
}: StickerToastProps) {
    const resolvedStickerTone =
    stickerTone ?? (tone === "white" ? "pink" : tone)
 
  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="sticker-toast"
      data-tone={tone}
      className={cn(stickerToastVariants({ tone }), className)}
      {...props}
    >
      <Sticker
        tone={resolvedStickerTone}
        shape={stickerShape}
        size="sm"
        tilt="left"
      >
        {stickerIcon}
      </Sticker>


      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[#091828]/70">
          {title}
        </p>
        <p className="truncate text-sm font-bold text-[#091828]">{name}</p>
        {description && (
          <p className="mt-0.5 truncate text-xs text-[#091828]/70">
            {description}
          </p>
        )}
      </div>


      <div className="flex items-center gap-1">
        {onView && (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1 rounded-full bg-[#0a1929] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#17131f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {viewLabel}
            <ChevronRight className="size-3" aria-hidden="true" />
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="inline-flex size-7 items-center justify-center rounded-full text-[#091828]/60 transition hover:bg-black/5 hover:text-[#091828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
     