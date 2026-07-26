import{ TYPE_LABEL,TYPE_OPTIONS } from "@/features/notifications/NotificationsVisuals"
import type{ NotifType } from "@/types/NotificationTypes"

type NotificationTypeFilterProps=Readonly<{
    value:NotifType|""
    onChange:(value:NotifType|"")=>void
}>

export function NotificationTypeFilter({
    value,
    onChange,
}:NotificationTypeFilterProps){
    return(
        <div className="relative flex-1">
            <label
                htmlFor="notification-type-filter"
                className="sr-only"
            >
                Notification type
            </label>
            <select
                id="notification-type-filter"
                value={value}
                onChange={(event)=>onChange(event.target.value as NotifType|"")}
                className="h-11 w-full appearance-none rounded-full border border-[#d4ded9] bg-white px-4 pr-10 text-sm font-semibold text-[#091828]"
            >
                <option value="">All types</option>
                {TYPE_OPTIONS.map((type)=>(
                    <option key={type} value={type}>
                        {TYPE_LABEL[type]}
                    </option>
                ))}
            </select>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6375]"
            >
                ▾
            </span>
        </div>
    )
}