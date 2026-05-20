// TODO: login ui
// replace stub placeholders with real form when auth ui feature is built

// this page will:
// 1. collect users email & password
// 2. call signIn() from auth.service.ts
// 3. redirect to /dashboard on success
// 4. display error messages inline
"use client";
import {useState} from "react";
import {useRouter} from "next/navigation"
import {signIn} from "@/./features/auth/auth.service";

import logo from "@/components/spendsense-logo-animated.svg";
import { LongButton } from "@/components/common/LongButton";
import { CustomInput } from "@/components/common/CustomInput";

//validation rules


export default function LoginPage(){
    const router=useRouter();
    const [identifier,setIdentifier]=useState("");//email
    const [password,setPassword]=useState("");
    const [error,setError]=useState<string|null>(null);
    const [isLoading,setIsLoading]=useState(false);
    const handleLogin=async ()=>{
        setError(null);
        if(!identifier || !password){
            setError("Please enter in valid email and password.");
            return;
        }
        setIsLoading(true);
        try{
            await signIn(identifier,password);//throws on faileur
            router.push("domains/dashboard");
        }catch(err:unknown){
            setError(err instanceof Error ? err.message:"Login Failed.");
        }finally{
            setIsLoading(false);
        }
    };
    return(
        <div className="min-h-screen flex items-center justify-center bg-[#F4FBF7] px-4">
            <img src={logo} alt="SpendSense" className="h-12"/>
            <div>  
                <h1>Welcome Back!</h1>
                <p>Your financial quests await.</p>
            </div> 
            <div>
                <div>//email address
                    <CustomInput
                        label="Email Address"
                        placeholder="ally@tuks.co.za"
                        value={identifier}
                        onChange={(e)=>setIdentifier(e.target.value)}
                    />
                </div>
                <div>//password
                    <CustomInput
                        label="Password"
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e)=>setPassword(e.target.value)}
                    />
                    {/*forgotPassword -> implimented later */}
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                //sign in button
                <LongButton onClick={handleLogin} disabled={isLoading} fullWidth>
                    {isLoading ? "Loading...":"Sign in"}
                </LongButton>
            </div>
            <div className="text-center text-[#44474C]">
                New Here?{" "}
                <link href="/domains/registration" className="text-princple hover:underline">
                    Sign up
                </link>
            </div>
        </div>
    )
}