//mascot placeholder. "coming soon"

import {Link} from "react-router-dom"
import {Smile} from "lucide-react"

import {CustomCard} from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { SubPageShell } from "@/components/common/SubPageShell"


export default function MascotPage(){
    return(
        <SubPageShell title= "Mascot Home">
            <CustomCard variant ="navyBorder" size ="md" className="text-center">
                <div className ="mx-auto flex size-12 items-center justify-center rounded-full bg-[#DCEFE8] text-[#091828]">
                    <Smile className ="size-6"/>
                </div>

                <p className="mt-3 text-lg font-extrabold text-[#091828]">Mascot Coming Soon</p>
            </CustomCard>

            <LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
                <Link to ="/profile">Back to Profile</Link>
            </LongButton>

        </SubPageShell>
    )
}
