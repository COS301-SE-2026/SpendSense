import * as React from "react"
import {CustomCard} from "@/components/ui/CustomCard"
import {LongButton} from "@/components/common/LongButton"
import {CustomInput} from "@/components/common/CustomInput"
import {SubPageShell} from "@/components/common/SubPageShell"
import {useUserProfile, initialsFor} from "@/hooks/useUserProfile"
import {updateMe} from "@/features/users/usersApi"

const NAME_MIN=1
const NAME_MAX=80

export default function EditProfilePage(){
    const{user, loading, refetch}= useUserProfile()
    const[displayName, setDisplayName]= React.useState("")
    const[saving, setSaving]= React.useState(false)
    const[feedback, setFeedback] =React.useState<{kind: "success"|"error", message: string} |null>(null)

    React.useEffect(()=> {
        if(user) setDisplayName(user.displayName)
    }, [user])

    const trimmed =displayName.trim()
    const nameError=
        trimmed.length<NAME_MIN ? "Display name can't be empty"
        : trimmed.length >NAME_MAX ? `Display name must be ${NAME_MAX} characters or fewer` : null

    const handleSave= async()=> {
        if(nameError) return
        setSaving(true)
        setFeedback(null)

        try{
            await updateMe({displayName: trimmed})
            setFeedback({kind: "success", message: "Profile updated successfully!"})
            refetch()
        }catch{
            setFeedback({kind: "error", message: "Couldn't save your changes. Please try again"})
        }finally{
            setSaving(false)
        }
    }

    return(
        <SubPageShell title="Edit Profile" subtitle="Update your details">
            {loading && <p className="text-sm text-[#6B6375]">Loading...</p>}
            {user && !loading &&(
                <>
                    <CustomCard variant="navyBorder" size="md" className="flex flex-col items-center text-center">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={`${user.displayName}'s avatar`}
                                className="size-16 rounded-full object-cover"
                            />

                        ):(
                            <div className="flex size-16 items-center justify-center rounded-full bg-[#0A1929] text-lg font-bold text-white">
                                {initialsFor(trimmed || user.displayName)}
                            </div>
                        )}

                        {/*TODO: avatar upload or URL field, still deciding*/}
                        <p className="mt-2 text-xs text-[#6B6375]">Avatar is generated from your name</p>
                    </CustomCard>

                    {/*Details*/}
                    <CustomCard variant="navyBorder" size="md">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label htmlFor="displayName" className="text-xs font-bold uppercase tracking-wide text-[#6B6375]">
                                    Display Name
                                </label>
                                <CustomInput
                                    id="displayName"
                                    value={displayName}
                                    onChange={(e)=> setDisplayName(e.target.value)}
                                    maxLength={NAME_MAX +1}
                                    aria-invalid={Boolean(nameError)}
                                    className="mt-1"
                                />

                                {nameError && (
                                    <p className="mt-1 text-xs text-[#AC2A5D]">{nameError}</p>
                                )}


                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-[#6B6375]">Email</p>
                                <p className="mt-1 text-sm text-[#091828]">{user.email}</p>
                                <p className="mt-0.5 text-xs text-[#6B6375]">Email changes go through account security, not this form</p>
                            </div>
                    

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-[#6B6375]">Member Since</p>
                            <p className="mt-1 text-sm text-[#091828]">{user.memberSince}</p>
                        </div>
                    </div>
                    
                    </CustomCard>
                    
                    <LongButton
                        LongVariant="primaryDark"
                        LongSize="md"
                        showArrow={false}
                        onClick={handleSave}
                        disabled={saving||loading||Boolean(nameError)}
                    >
                        {saving ? "Saving...": "Save Changes"}
                    </LongButton>

                    {feedback && (
                        <p className={`text-center text-xs ${feedback.kind}=== "success" ? "text-[#3DBFA0]" : "text-[#AC2A5D]"}`}>
                            {feedback.message}
                        </p>
                    )}

                </>
            )}
        </SubPageShell>
    )
}