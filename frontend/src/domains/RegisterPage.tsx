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
import { LongButton } from "../components/common/LongButton";
import { CustomInput } from "../components/common/CustomInput";
import { AuthLayout } from "../components/AuthLayout";
import { checkDisplayName, getMe } from "../features/users/usersApi";
import { Eye, EyeOff } from "lucide-react";

//validation rules
const registrationSchema=z.object({
    displayName:z
		.string()
		.trim()
		.min(1,"Display name is required.")
		.max(80,"Display name must be 80 characters or fewer."),
    email: z
        .string()
        .min(1,"Email is required.")
        .email("Please enter a valid email address"),
    password: z 
        .string()
        .min(8,"Password must be at least 8 characters")
		.regex(/[A-Z]/, "Password must contain at least one upper case letter")
		.regex(/[a-z]/, "Password must contain at least one lower case letter")
		.regex(/[0-9]/, "Password must contain at least one number")
		.regex(
			/[^A-Za-z0-9]/, 
			"Password must contain at least one special character",
		),
	confirmPassword:z
		.string()
}).refine((data)=>{
	if(data.confirmPassword && data.confirmPassword!==data.password){
		return false;
	}
	return true;
},{
	message:"Passwords do not match",
	path:["confirmPassword"],
});

type registrationFormData=z.infer<typeof registrationSchema>;

export default function RegisterPage(){
	const navigate=useNavigate();
	const [error,setError]=useState<string|null>(null);
	const [isLoading,setIsLoading]=useState(false);
	const [showPassword,setShowPassword]=useState(false);
	const [showConfirmPassword,setShowConfirmPassword]=useState(false);
	const {register,handleSubmit,formState:{errors}}=useForm<registrationFormData>({
		resolver:zodResolver(registrationSchema),
	});
	const onSubmit=async (data:registrationFormData)=>{
		setIsLoading(true);
		setError(null);
		try{
			const displayNameCheck = await checkDisplayName(data.displayName);
			if (!displayNameCheck.available) {
				setError(
					displayNameCheck.reason === "prohibited"
						? "This display name contains prohibited language."
						: "That display name is already taken."
				);
				return;
			}

			const result = await signUp(data.email, data.password, data.displayName);
			if (result.session) {
				await getMe();
				navigate("/onboarding");
			} else {
				setError("Check your email to confirm your account before signing in.");
			}
		}catch(err:unknown){
			setError(err instanceof Error ? err.message:"Registration failed.");
		}finally{
			setIsLoading(false);
		}
	}
	return(
		<AuthLayout>
			<div className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[5px_6px_0_#091828] sm:p-8 dark:border-[#2d3449] dark:bg-[#131b2e] dark:shadow-[5px_6px_0_#060e20]">
				<div className="mb-5">
					<span className="inline-block rounded-full bg-[#FFD8E6] px-3 py-1.5 text-[11px] font-extrabold text-[#AC2A5D] dark:bg-[#ff6b9d]/20 dark:text-[#ff6b9d]">LET'S GET STARTED</span>
					<h2 className="mt-3 text-3xl font-black tracking-[-1px] text-[#091828] dark:text-white">Create Account</h2>
					<p className="mt-1 text-sm text-[#6B6375] dark:text-[#a0aec0]"></p>
				</div>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						{/* inputs */}
					{/* display name */}
					<div className="space-y-2">
						<label htmlFor="displayName" className="text-sm font-bold text-[#091828] dark:text-white">Display name</label>
						<CustomInput
							id="displayName"
							variant="regLog"
							{...register("displayName")}
							placeholder="Morgie Walrus"
							className="w-full text-[#091828] placeholder:text-[#A0A9B1] dark:text-white"
						/>
						{errors.displayName && (<p className="text-xs text-red-600">{errors.displayName.message}</p>)}
					</div>
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-bold text-[#091828] dark:text-white">Email address</label>
						<CustomInput
							id="email"
							variant="regLog"
							{...register("email")}
							placeholder="morgie@tuks.co.za"
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
						<ul aria-label="Password requirements" className="grid list-disc grid-cols-2 gap-x-3 gap-y-1 pl-4 text-xs leading-4 text-[#6B6375] dark:text-[#a0aec0]">
							<li>8+ characters</li>
							<li>Uppercase letter</li>
							<li>Lowercase letter</li>
							<li>Number</li>
							<li>Special character</li>
						</ul>
						{errors.password && (<p className="text-xs text-red-600">{errors.password.message}</p>)}
					</div>
					{/* Confirm password */}
					<div className="space-y-2">
						<label htmlFor="confirmPassword" className="text-sm font-bold text-[#091828] dark:text-white">Confirm password</label>
						<div className="relative">
							<CustomInput
								id="confirmPassword"
								{...register("confirmPassword")}
								variant="regLog"
								type={showConfirmPassword ? "text" : "password"}
								placeholder="SuperSecretPassword"
								className="w-full pr-14 text-[#091828] placeholder:text-[#A0A9B1] dark:text-white"
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword((visible) => !visible)}
								aria-label={showConfirmPassword ? "Hide password" : "Show password"}
								aria-pressed={showConfirmPassword}
								className="absolute inset-y-0 right-4 flex items-center text-[#667085] hover:text-[#091828] dark:text-[#a0aec0] dark:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AC2A5D]"
							>
								{showConfirmPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
							</button>
						</div>
						{errors.confirmPassword && (<p className="text-xs text-red-600">{errors.confirmPassword.message}</p>)}
					</div>
					{error && <p className="text-xs text-red-600">{error}</p>}
					{/* login button*/}
					<div>
						<LongButton type="submit" LongVariant="primaryDark" disabled={isLoading} fullWidth>
							{isLoading ? "Loading...":"JOIN THE QUEST"}
						</LongButton>
					</div>
					<p className="text-center text-sm text-[#6B6375] dark:text-[#a0aec0]">
						Already have an account?{" "}
						<Link to="/login" className="font-extrabold text-[#AC2A5D] hover:underline dark:text-[#ff6b9d]">
							Log in
						</Link>
					</p>
				</form>
			</div>
		</AuthLayout>
	)
}
