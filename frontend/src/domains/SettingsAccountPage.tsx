import * as React from "react"
import {useNavigate} from "react-router-dom"
import {LogOut, UserX, Download} from "lucide-react"
import {CustomCard} from "@/components/ui/CustomCard"
import {LongButton} from "@/components/common/LongButton"
import {CustomInput} from "@/components/common/CustomInput"
import {SubPageShell} from "@/components/common/SubPageShell"
import {signOut} from "@/features/auth/auth.service"
import {deactivateAccount, exportUserData} from "@/features/profile/profileApi"

//logout, deactivate account, export data

export default function SettingsAccountPage(){
    const nav =useNavigate()
    const[confirmText, setConfirmText]= React.useState("")
    const[busy, setBusy]= React.useState<"logout"|"deactivate"|"export"|null>(null)
    const[feedback, setFeedback] =React.useState<{kind: "success" | "error"; message: string} |null>(null)


    const handleLogout =async()=> {
        setBusy("logout")
        try{
            await signOut()
            nav("/login")
        }catch{
            setFeedback({kind: "error", message: "Couldn't log out. Please try again."})
            setBusy(null)
        }
    }

    const handleExport=async()=> {
        setBusy("export")
        setFeedback(null)
        try{
            const data =await exportUserData()
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"})
            const url=URL.createObjectURL(blob)
            const a=document.createElement("a")
            a.href =url
            a.download = "spendsense-export.json"
            a.click()
            URL.revokeObjectURL(url)
            setFeedback({kind: "success", message: "Your data export has downloaded"})

        }catch{
            setFeedback({kind: "error", message: "Couldn't export your data. Please try again"})
        }finally{
            setBusy(null)
        }
    }

    const handleDeactivate =async()=> {
        if(confirmText !== "DELETE") return
        setBusy("deactivate")
        setFeedback(null)

        try{
            await deactivateAccount()
            await signOut()
            nav("/login")
        }catch{
            setFeedback({kind: "error", message: "Couldn't deactivate your account. Please try again"})
            setBusy(null)
        }

    }

    return (
        <SubPageShell title="Account" subtitle= "Session, deactivation and your data">
            {/*logout*/}
            
            <CustomCard variant ="navyBorder" size="sm" className="flex items-center gap-3 dark:border-[#574146] dark:bg-[#171f33]">
                <div className ="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E3EAE6] text-[#091828] dark:bg-[#2d3449] dark:text-[#dae2fd]">
                    <LogOut className="size-5"/>

                </div>
                <div className="min-w-0 flex-1">
                    <p className ="text-sm font-bold text-[#091828] dark:text-[#dae2fd]">Log Out</p>
                    <p className ="text-xs text-[#6B6375] dark:text-[#ddbfc5]">End your session on this device</p>
                </div>

                <LongButton
                    LongVariant="outline"
                    LongSize="sm"
                    className="dark:border-[#574146] dark:bg-[#2d3449] dark:text-[#dae2fd] dark:shadow-[3px_4px_0_#060e20] dark:hover:bg-[#3a4257]"
                    showArrow={false}
                    fullWidth={false}
                    onClick={handleLogout}
                    disabled={busy !== null}
                >
                    {busy === "logout" ? "..." : "Log out"}
                </LongButton>
            </CustomCard>


            {/*Data Export*/}
            <CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3 dark:border-[#574146] dark:bg-[#171f33]">
                <div className ="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8] text-[#091828] dark:bg-[#2d3449] dark:text-[#dae2fd]">
                    <Download className="size-5"/>
                    
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#091828] dark:text-[#dae2fd]">Export my data</p>
                    <p className ="text-xs text-[#6B6375] dark:text-[#ddbfc5]">Download everything SpendSense stores about you</p>
                </div>

                <LongButton
                    LongVariant="primaryMint"
                    LongSize="sm"
                    showArrow={false}
                    fullWidth={false}
                    onClick={handleExport}
                    disabled={busy !== null}
                >
                    {busy === "export" ? "..." : "Export"}
                </LongButton>
            </CustomCard>


            {/*Deactivate*/}

            <CustomCard variant="navyBorder" size="md" className="border-[#AC2A5D] dark:border-[#ffb4ab] dark:bg-[#171f33]">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFD8E6] text-[#AC2A5D] dark:bg-[#ffb4ab]/20 dark:text-[#ffb4ab]">
                        <UserX className="size-5"/>
                    
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#091828] dark:text-[#dae2fd]">Deactivate account</p>
                        <p className="text-xs text-[#6B6375] dark:text-[#ddbfc5]">Your account is deactivated. Your history is saved not destroyed. This cannot be undone from the app</p>
                    </div>
                </div>

                <label htmlFor="confirmDelete" className="mt-4 block text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#ddbfc5]">Type DELETE to confirm</label>

                <CustomInput
                    id="confirmDelete"
                    value={confirmText}
                    onChange={(e)=> setConfirmText(e.target.value)}
                    className="mt-1"
                />

                <LongButton
                    LongVariant="primaryPink"
                    LongSize="md"
                    showArrow={false}
                    className="mt-3 dark:bg-[#ffb4ab] dark:text-[#690005] dark:hover:bg-[#ffc9c2]"
                    onClick={handleDeactivate}
                    disabled={confirmText !== "DELETE" || busy !== null}
                >
                    {busy=== "deactivate" ? "Deactivating...": "Deactivate my account"}
                </LongButton>
            </CustomCard> 

            {feedback && (
                <p className={`text-center text-xs ${feedback.kind === "success" ? "text-[#3DBFA0]" : "text-[#AC2A5D] dark:text-[#ffb4ab]"}`}>
                    {feedback.message}
                </p>
            )}
        </SubPageShell>
    )

}