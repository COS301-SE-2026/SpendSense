import { Link } from "react-router-dom"
import { LongButton } from "@/components/common/LongButton"
import logo from "@/components/SpendSenseLogoLight.svg"

export default function LandingPage(){
    return(
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4fbf7] px-4">
            <div className="w-full max-w-sm space-y-6 text-center">

                <div className="flex items-center justify-center gap-2">
                    <img src= {logo} alt="SpendSense" className="w-60 h-auto"/>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold leading-tight text-[#091828]">Take control of your finances.</h1>
                    <p className="text-sm text-[#6b6375]">Track your spending, make payments, and build lasting habits.</p>
                </div>

                {/* maybe add a carousel here once we have our character/mascot with images */}

                <div className="space-y-3 pt-2">
                    <LongButton LongVariant="primaryPinkBorder" LongSize="lg" showArrow={false} asChild>
                        <Link to="/register">Get Started</Link>
                    </LongButton>

                    <LongButton LongVariant="outline" LongSize="lg" showArrow={false} asChild>
                        <Link to="/login">Already have an account?</Link>
                    </LongButton>
                </div>

                {/* could add a footer here about the project/team */}

            </div>
        </div>
            
    )
}