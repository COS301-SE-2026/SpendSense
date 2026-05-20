import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {cva,type VariantProps} from "class-variance-authority"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

//CVA for button variants
export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-input/30 hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
export type ButtonVariants=VariantProps<typeof buttonVariants>

export const iconButtonVariants=cva(
  "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none h-10 w-10",
  {
    variants:{
      variant:{
        iconBack: "bg-[#FFD9E1] text-[#AC2A5D] hover:bg-[#FFB3c6]",
        iconRefresh: "bg-[#DCEFE8] text-[#161D1B] hover:bg-[#bee5d6]",
        iconEdit: "bg-[#E3EAE6] text-[#091828] hover:bg-[#c7d8cf]",
        iconCancel: "bg-[#FE6A9C] text-[#6E0034] hover:bg-[#fd5c84]",
        iconNotif: "bg-[#E3EAE6] text-[#091828] hover:bg-[#c7d8cf]",
      },
    },
    defaultVariants:{
      variant:"iconBack",
    }
  }
)
export type IconButtonVariants=VariantProps<typeof iconButtonVariants>

//cva for badges
export const badgeVariants=cva(
  "inline-flex items-center justify-center rounded-full font-bold transition-all select-none",
  {
    variants:{
      variant:{
        xp:"bg-[#f2bf3c] border border-[#0a1929] shadow-[3px_4px_0_#0a1929] text-[#0a1929]",
        tier:"bg-[#E0B0FF] border border-[#0a1929] shadow-[3px_4px_0_#0a1929] text-[#6E0034]",
        streak:"bg-[#AC2B5E] border-none text-white",
        level:"bg-[#0a1929] text-white border-none",
      },
      size:{
        sm:"text-xs px-2 py-1",
        md:"text-sm px-3 py-1.5",
        lg:"text-base px-4 py-2"
      },
    },
    defaultVariants:{
      variant:"xp",
      size: "md",
    },
  }
)
export type BadgeVariants=VariantProps<typeof badgeVariants>

//CVA for Sticker Variants

export const stickerVariants = cva(
"relative inline-flex items-center justify-center shrink-0 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        pink:"bg-[#FCE0E8] text-[#AC2A5D]",
        yellow:"bg-[#FFE7AE] text-[#7A4A00]",
        slate:"bg-[#D7DEE4] text-[#3E4A55]",
        mint:"bg-[#DCEFE8] text-[#16635A]",
        blue:"bg-[#DCE8F7] text-[#1E4FAE]",
        maroon:"bg-[#6E0034] text-[#FFFFFF]",
        hotpink: "bg-[#FF6B9D] text-[#700034]",
      },
      shape: {
        circle:"rounded-full",
        squircle:"rounded-[32%]",
      },
      size: {
        sm:"size-16[&_svg:not([class*='size-'])]:size-7",
        md:"size-24[&_svg:not([class*='size-'])]:size-10",
        lg:"size-32[&_svg:not([class*='size-'])]:size-14",
        xl:"size-44[&_svg:not([class*='size-'])]:size-20",
      },
      state: {
        earned: "",
        locked:"bg-transparent text-[#A8B4AE] border-2 border-dashed border-[#A8B4AE] [&_svg]:opacity-70",
      },
      tilt: {
        none:"",
        left: "-rotate-3",
        right:"rotate-3",
      },
    },
    defaultVariants: {
      tone:"pink",
      shape:"circle",
      size: "md",
      state: "earned",
      tilt: "none",
    },
  }
)
export type StickerVariants = VariantProps<typeof stickerVariants>

export const stickerToastVariants = cva(
  "flex items-center gap-3 rounded-2xl border-2 border-[#0a1929] px-4 py-3 shadow-[3px_4px_0_#0a1929] w-full max-w-sm",
  {
    variants: {
      tone: {
        pink:"bg-[#FCE0E8]",
        yellow:"bg-[#FFE7AE]",
        mint:"bg-[#DCEFE8]",
        blue:"bg-[#DCE8F7]",
        slate:"bg-[#D7DEE4]",
        maroon:"bg-[#FFD9E1]",
        hotpink:"bg-[#FFD9E1]",
        white:"bg-white",
      },
    },
    defaultVariants: {
      tone:"pink",
    },
  }
)
export type StickerToastVariants = VariantProps<typeof stickerToastVariants>
 
