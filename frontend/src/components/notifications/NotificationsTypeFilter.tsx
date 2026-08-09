import * as React from "react"
import {CategoryIcon} from "@/components/common/CategoryIcon"
import {cn} from "@/lib/utils"
import type {NotifType} from "@/types/NotificationTypes"
import {
    ALL_TYPES_ICON,
    TYPE_ICON,
    TYPE_LABEL,
    TYPE_OPTIONS,
    TYPE_TONE,
} from "@/features/notifications/NotificationsVisuals"

type NotificationTypeFilterProps=Readonly<{
    value:NotifType|""
    onChange:(value:NotifType|"")=>void
}>

export function NotificationTypeFilter({
    value,
    onChange,
}:NotificationTypeFilterProps){
    const dialogRef=React.useRef<HTMLDialogElement>(null)
    function openDialog(){
        dialogRef.current?.showModal()
    }
    function closeDialog(){
        dialogRef.current?.close()
    }
    function select(next:NotifType|""){
        onChange(next)
        closeDialog()
    }
    return(
        <div className="flex-1">
            <button
                type="button"
                aria-haspopup="dialog"
                onClick={openDialog}
                className="flex h-11 w-full items-center rounded-full border border-[#d4ded9] bg-white px-3 text-sm font-semibold text-[#091828] dark:border-[#2d3449] dark:bg-[#131b2e] dark:text-[#ffffff]"
            >
                <CategoryIcon
                    tone={value?TYPE_TONE[value]:"lilac"}
                    size="sm"
                >
                    <span className="[&_svg]:size-3.5">
                        {value?TYPE_ICON[value]:ALL_TYPES_ICON}
                    </span>
                </CategoryIcon>

                <span className="truncate pl-2.5">
                    {value?TYPE_LABEL[value]:"All types"}
                </span>
            </button>
            <dialog
                ref={dialogRef}
                aria-label="Filter by notification type"
                className="fixed bottom-0 left-1/2 top-auto m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-t-3xl bg-white p-0 shadow-lg backdrop:bg-black/30 dark:bg-[#131b2e]"
                onCancel={closeDialog}
            >
                <div className="pb-6 pt-3">
                    <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#e8e4f4] dark:bg-[#1c263c]"/>

                    <div className="flex items-center justify-between px-5 pb-2">
                        <h2 className="text-base font-bold text-[#091828] dark:text-[#ffffff]">
                            Filter by type
                        </h2>

                        <button
                            type="button"
                            onClick={closeDialog}
                            className="text-sm font-semibold text-[#6b6375] dark:text-[#a0aec0]"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="px-3">
                        <FilterOption
                            active={value===""}
                            label="All types"
                            icon={
                                <CategoryIcon tone="lilac" size="sm">
                                    <span className="[&_svg]:size-3.5">
                                        {ALL_TYPES_ICON}
                                    </span>
                                </CategoryIcon>
                            }
                            onClick={()=>select("")}
                        />
                        {TYPE_OPTIONS.map((type)=>(
                            <FilterOption
                                key={type}
                                active={value===type}
                                label={TYPE_LABEL[type]}
                                icon={
                                    <CategoryIcon
                                        tone={TYPE_TONE[type]}
                                        size="sm"
                                    >
                                        <span className="[&_svg]:size-3.5">
                                            {TYPE_ICON[type]}
                                        </span>
                                    </CategoryIcon>
                                }
                                onClick={()=>select(type)}
                            />
                        ))}
                    </div>
                </div>
            </dialog>
        </div>
    )
}

type FilterOptionProps=Readonly<{
    label:string
    icon?:React.ReactNode
    active:boolean
    onClick:()=>void
}>

function FilterOption({
    label,
    icon,
    active,
    onClick,
}:FilterOptionProps){
    return(
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm font-semibold text-[#091828] hover:bg-[#f4fbf7] dark:text-[#ffffff]",
                active&&"bg-[#fbfefc] dark:bg-[#1c263c]",
            )}
        >
            {icon??(
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4fbf7] dark:bg-[#1c263c]"/>
            )}

            {label}
        </button>
    )
}