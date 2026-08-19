import { Search } from "lucide-react"

export function SearchBox({
    value,
    onChange,
    placeHolder,
}: Readonly<{
    value: string
    onChange: (value: string) => void
    placeHolder?: string
}>) {
    return(
        <div className="flex items-center gap-2 rounded-full border border-[#091828] bg-white px-4 py-2.5 shadow-[3px_4px_0_#091828]">
            <Search className="size-4 shrink-0 text-[#6B6375]"/>
            <input
                type="text"
                value={value}
                placeholder={placeHolder}
                onChange={(e)=> onChange(e.target.value)}
                className="w-full bg-transparent text-sm text-[#091828] outline-none placeholder:text-[#6B6375]"/>
                
        </div>
            
    )
}