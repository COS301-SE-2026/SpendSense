// this page will:
// 1. collect users email & password
// 2. call signIn() from auth.service.ts
// 3. redirect to /dashboard on success
// 4. display error messages inline
"use client";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {signIn} from "../features/auth/auth.service";
import { Link, useNavigate} from "react-router-dom";
import { LongButton } from "../components/common/LongButton";
import { CustomInput } from "../components/common/CustomInput";
import { AuthLayout } from "../components/AuthLayout";
import { Eye, EyeOff } from "lucide-react";

//validation rules
const loginSchema=z.object({
    email: z
        .string()
        .min(1,"Email is required.")
        .email("Please enter a valid email address"),
    password: z 
        .string()
        .min(6,"Password must be at least 6 characters"),
});

type LoginFormData=z.infer<typeof loginSchema>;

export default function LoginPage(){
    const navigate=useNavigate();
    const [error,setError]=useState<string|null>(null);
    const [isLoading,setIsLoading]=useState(false);
    const [showPassword,setShowPassword]=useState(false);
    const {register,handleSubmit,formState:{errors}}=useForm<LoginFormData>({
        resolver:zodResolver(loginSchema),
    });
    const onSubmit=async (data:LoginFormData)=>{
        setIsLoading(true);
        setError(null);
        try{
            await signIn(data.email,data.password);
            navigate("/domains/dashboard");
        }catch(err:unknown){
            setError(err instanceof Error ? err.message:"Login failed.");
        }finally{
            setIsLoading(false);
        }
    }
    return(
        <AuthLayout>
            <div className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[5px_6px_0_#091828] sm:p-8 dark:border-[#2d3449] dark:bg-[#131b2e] dark:shadow-[5px_6px_0_#060e20]">
                <div className="mb-6">
                    <span className="inline-block rounded-full bg-[#FFD8E6] px-3 py-1.5 text-[11px] font-extrabold text-[#AC2A5D] dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]">WELCOME BACK</span>
                    <h2 className="mt-3 text-3xl font-black tracking-[-1px] text-[#091828] dark:text-white">Sign in</h2>
                    <p className="mt-1 text-sm text-[#6B6375] dark:text-[#a0aec0]"></p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* inputs */}
                    <div className="space-y-2">
                        <label htmlFor="loginEmail" className="text-sm font-bold text-[#091828] dark:text-white">Email address</label>
                        <CustomInput
                            id="loginEmail"
                            variant="regLog"
                            {...register("email")}
                            placeholder="ally@tuks.co.za"
                            className="w-full text-[#091828] placeholder:text-[#A0A9B1] dark:text-white"
                        />
                        {errors.email && (<p className="text-xs text-red-600">{errors.email.message}</p>)}
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-bold text-[#091828] dark:text-white">Password</label>
                        <div className="relative">
                            <CustomInput
                                id="password"
                                {...register("password")}
                                variant="regLog"
                                type={showPassword ? "text" : "password"}
                                placeholder="SuperSecretPassword"
                                className="w-full pr-14 text-[#091828] placeholder:text-[#A0A9B1] dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute inset-y-0 right-4 flex items-center text-[#667085] hover:text-[#091828] dark:text-[#a0aec0] dark:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AC2A5D]"
                            >
                                {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                            </button>
                        </div>
                        {errors.password && (<p className="text-xs text-red-600">{errors.password.message}</p>)}
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    {/* sign in button */}
                    <div>
                        <LongButton type="submit" LongVariant="primaryPinkBorder" disabled={isLoading} fullWidth>
                            {isLoading ? "Loading...":"Sign in"}
                        </LongButton>
                    </div>
                    <p className="text-center text-sm text-[#6B6375] dark:text-[#a0aec0]">
                        New to SpendSense?{" "}
                        <Link to="/register" className="font-extrabold text-[#AC2A5D] hover:underline dark:text-[#ff6b9d]">
                            Create an account
                        </Link>
                    </p>
                </form>
            </div>
        </AuthLayout>
    )
}