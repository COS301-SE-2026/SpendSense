export type OccurrenceStatus =
	| "PENDING"
	| "OVERDUE"
	| "PAID"
	| "PAID_LATE"
	| "MISSED"
	| "CANCELLED"


export const BADGE_STYLES: Record<OccurrenceStatus, {bg: string; text: string; label: string}> = {
	PENDING: {bg: "bg-[#FFD9E1] dark:bg-[#2d1b2e]", text: "text-[#3F001B] dark:text-[#ff6b9d]", label: "DUE SOON"},
	OVERDUE: {bg: "bg-[#AC2A5D] dark:bg-[#93000a]", text: "text-white dark:text-[#ffdad6]", label: "OVERDUE"},
	PAID: {bg: "bg-[#6FC9B0] dark:bg-[#0f4f42]", text: "text-white dark:text-[#5eead4]", label: "PAID"},
	PAID_LATE: {bg: "bg-[#6FC9B0] dark:bg-[#0f4f42]", text: "text-white dark:text-[#5eead4]", label: "PAID LATE"},
	MISSED: {bg: "bg-[#AC2A5D] dark:bg-[#93000a]", text: "text-white dark:text-[#ffdad6]", label: "MISSED"},
	CANCELLED: {bg: "bg-[#D3D3D3] dark:bg-[#2d3449]", text: "text-[#555] dark:text-[#a0aec0]", label: "CANCELLED"},
}

export function isPayable(status: OccurrenceStatus): boolean{
	return status === "PENDING" || status === "OVERDUE"
}

export function formatCurrency(amount: number): string{
	return `R ${amount.toLocaleString("en-ZA", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
}

export function iconBgForType(type: string): string{
	switch(type){
		case "RENT": return "bg-[#091828] dark:bg-[#a0aec0]"
		case "SUBSCRIPTION": return "bg-[#E9D5FF]"
		case "UTILITY": return "bg-[#DCEFE8]"
		case "BNPL": return "bg-[#FFE9B5]"
		case "IOU": return "bg-[#FFD9E1]"
		default: return "bg-[#E3EAE6]"
	}
}