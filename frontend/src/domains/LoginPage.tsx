// TODO: login ui
// replace stub placeholders with real form when auth ui feature is built

// this page will:
// 1. collect users email & password
// 2. call signIn() from auth.service.ts
// 3. redirect to /dashboard on success
// 4. display error messages inline
"use client";
import React from "react";
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
                        <label className="text-xs font-semibold text-[#091828]">Password</label>
                        <CustomInput
                            {...register("password")}
                            variant="regLog"
                            type="password"
                            placeholder="SuperSecretPassword"
                            className="w-full"
                        />
                        {errors.password && (<p className="text-xs text-red-600">{errors.password.message}</p>)}
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    {/* sign in button */}
                    <div>
                        <LongButton type="submit" LongVariant="primaryPinkBorder" disabled={isLoading} fullWidth>
                            {isLoading ? "Loading...":"Sign in"}
                        </LongButton>
                    </div>
                    {/* line break thingy */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-[#B0B7C3]" />
                            <span className="text-[10px] tracking-widest text-[#667085] font-medium uppercase">
                                Or continue with
                            </span>
                        <div className="flex-1 h-px bg-[#B0B7C3]" />
                    </div>
                    {/* login with google butt */}
                    <div>
                        <LongButton type="submit" LongVariant="outline"  disabled fullWidth>
                            {isLoading ? "Loading...":"Will be login with Google"}
                        </LongButton>
                    </div>
                    <div className="text-center text-[#44474C]">
                        New Here?{" "}
                        <Link to="/domains/registration" className="text-[#AC2A5D] text-princple hover:underline">
                            Sign up
                        </Link>
                    </div>
                </form>
            </div>
            
        </div>
    )
}