// TODO: register ui
// replace stub placeholders with real form when auth ui feature is built

// this page will:
// 1. collect users email & password (and confirm password)
// 2. call signUp() from auth.service.ts
// 3. prompt user to confirm email or redirect on success
// 4. display error messages inline

import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {signUp} from "../features/auth/auth.service";
import { Link, useNavigate} from "react-router-dom";
import logo from "../components/SpendSenseLogoLight.svg";
import { LongButton } from "../components/common/LongButton";
import { CustomInput } from "../components/common/CustomInput";

//validation rules
const registrationSchema=z.object({
    displayName:z
		.string()
		.min(1,"Full name is required."),
    email: z
        .string()
        .min(1,"Email is required.")
        .email("Please enter a valid email address"),
    password: z 
        .string()
        .min(6,"Password must be at least 6 characters"),
	confirmPassword:z
		.string()
}).refine((data)=>{
	if(data.confirmPassword && data.confirmPassword!==data.password){
		return false;
	}
	return true;
},{
	message:"Passwords do no match",
	path:["confirmPassword"],
});

type registrationFormData=z.infer<typeof registrationSchema>;

export default function RegisterPage(){
	const navigate=useNavigate();
	const [error,setError]=useState<string|null>(null);
	const [isLoading,setIsLoading]=useState(false);
	const {register,handleSubmit,formState:{errors}}=useForm<registrationFormData>({
		resolver:zodResolver(registrationSchema),
	});
	const onSubmit=async (data:registrationFormData)=>{
		setIsLoading(true);
		setError(null);
		try{
			await signUp(data.email,data.password);
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
					<h1 className="text-[#091828] text-3xl font-bold">Create Account</h1>
					<p className="text-[#44474C]">Master your money, one quest at a time.</p>
				</div> 
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
						{/* inputs */}
					{/* fullname->displayName */}
					<div className="space-y-1">
						<label htmlFor="displayName" className="text-xs font-semibold text-[#091828]">Full name</label>
						<CustomInput
							id="displayName"
							variant="regLog"
							{...register("displayName")}
							placeholder="Morgie Walrus"
							className="w-full"
						/>
						{errors.displayName && (<p className="text-xs text-red-600">{errors.displayName.message}</p>)}
					</div>
					<div className="space-y-1">
						<label htmlFor="email" className="text-xs font-semibold text-[#091828]">Email Address</label>
						<CustomInput
							id="email"
							variant="regLog"
							{...register("email")}
							placeholder="morgie@tuks.co.za"
							className="w-full"
						/>
						{errors.email && (<p className="text-xs text-red-600">{errors.email.message}</p>)}
					</div>
					<div className="space-y-3">
						<label htmlFor="password" className="text-xs font-semibold text-[#091828]">Password</label>
						<CustomInput
						id="password"
							{...register("password")}
							variant="regLog"
							type="password"
							placeholder="SuperSecretPassword"
							className="w-full"
						/>
						{errors.password && (<p className="text-xs text-red-600">{errors.password.message}</p>)}
					</div>
					{/* confirm pass->confimPassowrd */}
					<div className="space-y-3">
						<label htmlFor="confirmPassword" className="text-xs font-semibold text-[#091828]">Confirm password</label>
						<CustomInput
							id="confirmPassword"
							{...register("confirmPassword")}
							variant="regLog"
							type="password"
							placeholder="SuperSecretPassword"
							className="w-full"
						/>
						{errors.confirmPassword && (<p className="text-xs text-red-600">{errors.confirmPassword.message}</p>)}
					</div>
					{error && <p className="text-xs text-red-600">{error}</p>}
					{/* login button*/}
					<div>
						<LongButton type="submit" LongVariant="primaryDark" disabled={isLoading} fullWidth>
							{isLoading ? "Loading...":"JOIN THE QUEST"}
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
							{isLoading ? "Loading...":"Will be sign up with Google"}
						</LongButton>
					</div>
					<div className="text-center text-[#44474C]">
						Already have an account?{" "}
						<Link to="/domains/LoginPage" className="text-[#AC2A5D] text-princple hover:underline">
							Log in
						</Link>
					</div>
				</form>
			</div>	
		</div>
	)
}