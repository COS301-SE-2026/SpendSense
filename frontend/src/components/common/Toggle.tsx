export function Toggle({
    checked,
    onChange,
    label,
}: Readonly<{
    checked: boolean
    onChange:()=> void
    label: string
}>){
    return(
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={onChange}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#AC2A5D]": "bg-[#E3EAE6] dark:bg-[#2d3449]"}`}>

            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]": "left-0.5"}`} />
        </button>
    )
}