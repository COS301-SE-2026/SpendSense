import * as React from "react"
import{ CategoryIcon } from "@/components/common/CategoryIcon"
import{ cn } from "@/lib/utils"
import type{ NotifType } from "@/types/NotificationTypes"
import{ TYPE_ICON,TYPE_TONE,TYPE_LABEL,TYPE_OPTIONS,ALL_TYPES_ICON } from "@/features/notifications/NotificationsVisuals"

export function NotificationTypeFilter({
    value,
    onChange,
}:{
    value:NotifType|""
    onChange:(value:NotifType|"")=>void
}){
    const [open,setOpen]=React.useState(false)
    function select(next:NotifType|""){
        onChange(next)
        setOpen(false)
    }
    return (
        <div className="flex-1">
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={()=>setOpen(true)}
                className="flex h-11 w-full items-center rounded-full border border-[#d4ded9] bg-white px-3 text-sm font-semibold text-[#091828]"
            >
                <CategoryIcon tone={value ? TYPE_TONE[value] :"lilac"} size="sm">
                    <span className="[&_svg]:size-3.5">{value ? TYPE_ICON[value] :ALL_TYPES_ICON}</span>
                </CategoryIcon>
                <span className="truncate pl-2.5">{value ? TYPE_LABEL[value] :"All types"}</span>
            </button>
            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/30 animate-in fade-in duration-150"
                        onClick={()=>setOpen(false)}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Filter by notification type"
                        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white pb-6 pt-3 shadow-lg animate-in slide-in-from-bottom duration-200"
                    >
                        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#e8e4f4]" />
                        <div className="flex items-center justify-between px-5 pb-2">
                            <h2 className="text-base font-bold text-[#091828]">Filter by type</h2>
                            <button
                                type="button"
                                onClick={()=>setOpen(false)}
                                className="text-sm font-semibold text-[#6b6375]"
                            >
                                Cancel
                            </button>
                        </div>
                        <div role="listbox" className="px-3">
                            <FilterOption
                                active={value === ""}
                                label="All types"
                                icon={
                                    <CategoryIcon tone="lilac" size="sm">
                                        <span className="[&_svg]:size-3.5">{ALL_TYPES_ICON}</span>
                                    </CategoryIcon>
                                }
                                onClick={()=>select("")}
                            />
                            {TYPE_OPTIONS.map((type)=>(
                                <FilterOption
                                    key={type}
                                    active={value === type}
                                    label={TYPE_LABEL[type]}
                                    icon={
                                        <CategoryIcon tone={TYPE_TONE[type]} size="sm">
                                            <span className="[&_svg]:size-3.5">{TYPE_ICON[type]}</span>
                                        </CategoryIcon>
                                    }
                                    onClick={()=>select(type)}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function FilterOption({
    label,
    icon,
    active,
    onClick,
}:{
    label:string
    icon?:React.ReactNode
    active:boolean
    onClick:()=>void
}){
    return (
        <button
            type="button"
            role="option"
            aria-selected={active}
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm font-semibold text-[#091828] hover:bg-[#f4fbf7]",
                active && "bg-[#fbfefc]",
            )}
        >
           {icon ?? <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4fbf7]" />}
           {label}
        </button>
    )
}