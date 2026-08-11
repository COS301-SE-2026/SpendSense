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

export const CustomInput=React.forwardRef<HTMLInputElement,CustomInputProps>(({
        className,
        variant="form",
        inputSize="md",
        id,
        ...props
    },
    ref
)=>{
    const variantStyles:Record<InputVariant,string>={
        regLog:"bg-white border border-[#DBE2DE] rounded-full text-[#787A80] dark:border-[#574146] dark:bg-[#2d3449] dark:text-[#dae2fd]",
        form:"bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none dark:bg-[#2d3449] dark:text-[#dae2fd] dark:shadow-none",
    }
    const sizeStyles:Record<InputSize,string>={
        sm: "h-9 px-5 text-xs",
        md: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
    }
    return(
        <input
            id={id}
            ref={ref}
            className={cn(
                "rounded-lg transition-shadow focus:shadow-md dark:placeholder:text-[#b9a2a8]",
                variantStyles[variant],
                sizeStyles[inputSize],
                className
            )}
            {...props}
        />
    )
});
CustomInput.displayName="CustomImput";