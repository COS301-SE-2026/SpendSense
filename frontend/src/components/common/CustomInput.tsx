import * as React from "react"
import {cn} from "@/lib/utils"

type InputVariant= "regLog"|"form"
type InputSize="sm"|"md"|"lg"
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement>{
    // label?: string;
    // plaeholder?:string;
    // value:string;
    // type?:string;
    // onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;
    variant?:InputVariant;
    inputSize?: InputSize;
}

export function CustomInput({
    className,
    variant="form",
    inputSize="md",
    ...props
}:CustomInputProps){
    const variantStyles:Record<InputVariant,string>={
        regLog:"bg-white border border-[#DBE2DE] rounded-full text-[#787A80]",
        form:"bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none",
    }
    const sizeStyles:Record<InputSize,string>={
        sm: "h-9 px-5 text-xs",
        md: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
    }
    return(
        <input
            className={cn(
                "rounded-lg transition-shadow focus:shadow-md",
                variantStyles[variant],
                sizeStyles[inputSize],
                className
            )}
            {...props}
        />
    )
}