import{ Award,Banknote,Calendar,Gift,Info,LayoutGrid,TrendingUp } from "lucide-react"
import type{ NotifType } from "@/types/NotificationTypes"

export const TYPE_ICON:Record<NotifType,React.ReactNode>={
    REMINDER:<Calendar className="size-4" />,
    PAYMENT_STATUS:<Banknote className="size-4" />,
    SCORE_CHANGE:<TrendingUp className="size-4" />,
    BADGE_EARNED:<Award className="size-4" />,
    REWARD:<Gift className="size-4" />,
    SYSTEM:<Info className="size-4" />,
}

export const TYPE_TONE:Record<NotifType,"mint"|"lilac"|"pink"|"yellow"|"navy">={
    REMINDER:"yellow",
    PAYMENT_STATUS:"lilac",
    SCORE_CHANGE:"mint",
    BADGE_EARNED:"pink",
    REWARD:"yellow",
    SYSTEM:"navy",
}

export const TYPE_LABEL:Record<NotifType,string>={
    REMINDER:"Reminders",
    PAYMENT_STATUS:"Payment status",
    SCORE_CHANGE:"Score changes",
    BADGE_EARNED:"Badges",
    REWARD:"Rewards",
    SYSTEM:"System",
}

export const TYPE_OPTIONS:NotifType[]=[
    "REMINDER","PAYMENT_STATUS","SCORE_CHANGE","BADGE_EARNED","REWARD","SYSTEM",
]

export const ALL_TYPES_ICON=<LayoutGrid className="size-4" />