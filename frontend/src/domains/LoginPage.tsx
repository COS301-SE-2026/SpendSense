// TODO: login ui
// replace stub placeholders with real form when auth ui feature is built

// this page will:
// 1. collect users email & password
// 2. call signIn() from auth.service.ts
// 3. redirect to /dashboard on success
// 4. display error messages inline
"use client";
import {useState} from "react";
// import { useNavigate } from "react-router-dom";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {signIn} from "../features/auth/auth.service";
import { Link, useNavigate} from "react-router-dom";
import logo from "../components/SpendSenseLogoLight.svg";
import { LongButton } from "../components/common/LongButton";
import { CustomInput } from "../components/common/CustomInput";
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4FBF7] px-4">
            <div className="w-full max-w-sm space-y-5">
                {/* header */}
                <div className="text-center space-y-1">  
                    <img src={logo} alt="SpendSense" className="h-24 mx-auto"/>
                    <h1 className="text-[#091828] text-3xl font-bold">Welcome Back!</h1>
                    <p className="text-[#44474C]">Your financial quests await.</p>
                </div> 
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* inputs */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828]">Email Address</label>
                        {/* forgotpassword goes here */}
                        <CustomInput
                            variant="regLog"
                            {...register("email")}
                            placeholder="ally@tuks.co.za"
                            className="w-full"
                        />
                        {errors.email && (<p className="text-xs text-red-600">{errors.email.message}</p>)}
                    </div>
                    <div className="space-y-3">
                        <label htmlFor="password" className="text-xs font-semibold text-[#091828]">Password</label>
                        <div className="relative">
                            <CustomInput
                                id="password"
                                {...register("password")}
                                variant="regLog"
                                type={showPassword ? "text" : "password"}
                                placeholder="SuperSecretPassword"
                                className="w-full pr-14"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute inset-y-0 right-4 flex items-center text-[#667085] hover:text-[#091828] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AC2A5D]"
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
                    <div className="text-center text-[#44474C]">
                        New Here?{" "}
                        <Link to="/register" className="text-[#AC2A5D] text-princple hover:underline">
                            Sign up
                        </Link>
                    </div>
                </form>
            </div>
            
        </div>
    )
}