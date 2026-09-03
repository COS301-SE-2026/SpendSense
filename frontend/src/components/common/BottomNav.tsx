import * as React from "react"
import {Link} from "react-router-dom"
import {
	Home,
	Calendar as CalendarIcon,
	Users,
	Sparkles,
} from "lucide-react"
 
import {AddTransactionButton} from "@/components/common/AddTransactionButton"
import {cn} from "@/lib/utils"


export type BottomNavTab = "home"|"calendar"|"friends"|"mascot"
 
export function BottomNav({
    active
}: Readonly<{
    active?: BottomNavTab 
}>) {
	return (
		<nav
			aria-label="Primary"
			className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E4F4] bg-white/95 backdrop-blur dark:border-[#574146] dark:bg-[#171f33]/95">

			<div className="mx-auto flex w-full max-w-md items-center justify-around px-4 py-2">

				<BottomNavItem to="/" icon={<Home className="size-5" />} label="Home" active={active === "home"} />
				<BottomNavItem to="/calendar" icon={<CalendarIcon className="size-5" />} label="Calendar" active={active === "calendar"} />
 
				{/* floating + action */}
				<AddTransactionButton />
 
				<BottomNavItem to="/friends" icon={<Users className="size-5" />} label="Friends" active={active === "friends"} />
				<BottomNavItem to="/mascot" icon={<Sparkles className="size-5" />} label="Mascot" active={active === "mascot"} disabled={false} />
			</div>
		</nav>
	)
}
 
function BottomNavItem({
	to,
	icon,
	label,
	active,
	disabled,
}: Readonly<{
	to: string
	icon: React.ReactNode
	label: string
	active: boolean
	disabled?: boolean
}>) {
	return (
		<Link
			to={to}
			aria-disabled={disabled}
			onClick={(e) => {
				if (disabled) {
					e.preventDefault();
				}
			}}
			className={cn(
				"flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
				active
					? "bg-[#FFD8E6] text-[#ac2a5d] dark:bg-[#ff6b9d] dark:text-[#6e0035]"
					: "text-[#6b6375] hover:text-[#091828] dark:text-[#ddbfc5] dark:hover:text-[#dae2fd]",
				disabled && "opacity-35 pointer-events-none cursor-not-allowed select-none"
			)}
			aria-current={active ? "page" : undefined}>
		
			{icon}
			<span>{label}</span>
		</Link>
	)
}