import * as React from "react"
 
import {CustomCard} from "@/components/ui/CustomCard"
import {LongButton} from "@/components/common/LongButton"
import {SubPageShell} from "@/components/common/SubPageShell"
import {useUserProfile} from "@/hooks/useUserProfile"
import {updatePreferences, type UserPreferences} from "@/features/profile/profileApi"


const THEMES: UserPreferences["theme"][]=["SYSTEM", "LIGHT", "DARK"]
const CURRENCIES=["ZAR"]
const LANGUAGES=[{code: "en", label: "English"}]


export default function SettingsPreferencesPage(){
    const{user, loading, error, refetch} =useUserProfile()
    const[prefs, setPrefs]=React.useState<UserPreferences | null>(null)
    const[saving, setSaving]=React.useState(false)
    const[feedback, setFeedback]=React.useState<{kind: "success" | "error"; message: string} | null>(null)


    React.useEffect(()=> {
        if(user?.preferences){
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPrefs({
                theme: user.preferences.theme as UserPreferences["theme"],
                currency: user.preferences.currency,
                language: user.preferences.language,
                reducedMotion: user.preferences.reducedMotion,
            })
        }
    }, [user])

    const handleSave= async()=> {
        if(!prefs) return

        setSaving(true)
        setFeedback(null)

        try{
            await updatePreferences(prefs)
            setFeedback({kind: "success", message: "Preferences saved"})
        }catch{
            setFeedback({kind: "error", message: "Couldn't save preferences. Please try again"})
        }finally{
            setSaving(false)
        }

    }

    return(
        <SubPageShell title="General Preferences" subtitle= "Theme, currency, language and motion">
            {loading && <p className="text-sm text-[#6B6375]">Loading...</p>}

            {error && !loading && (
				<div>
					<p className="text-sm text-[#ac2a5d]">Couldn't load your preferences.</p>
					<button
						type="button"
						onClick={refetch}
						className="mt-2 text-xs font-bold text-[#091828] underline"
					>
						Try again
					</button>
				</div>
			)}
 
			{!prefs && !loading && !error && (
				<p className="text-sm text-[#6b6375]">
					No preferences found for this account yet.
				</p>
			)}

            {prefs && !loading && (
                <>
                    <CustomCard variant="navyBorder" size="md">
                        <div className="flex flex-col gap-5">
                            <Field label="Theme">
                                <div className="flex gap-2">
                                    {THEMES.map((t)=>(
                                        <PillOption
                                            key={t}
                                            label={t.charAt(0) + t.slice(1).toLowerCase()}
                                            selected={prefs.theme === t}
                                            onSelect={()=> setPrefs({...prefs, theme: t})}
                                        />
                                    ))}
                                </div>
                            </Field>


                            <Field label="Currency">
                                <div className="flex gap-2">
                                    {CURRENCIES.map((c)=> (
                                        <PillOption
                                            key={c}
                                            label={c}
                                            selected={prefs.currency===c}
                                            onSelect={()=> setPrefs({...prefs, currency: c})}
                                        />
                                    ))}
                                </div>
                            </Field>


                            <Field label="Language">
                                <div className="flex gap-2">
                                    {LANGUAGES.map((l)=> (
                                        <PillOption
                                            key={l.code}
                                            label={l.label}
                                            selected={prefs.language === l.code}
                                            onSelect={()=> setPrefs({...prefs, language: l.code})}
                                        />
                                    ))}
                                </div>
                            </Field>


                            <Field label="Reduced Motion">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-[#6B6375]">Reduce animations</p>
                                    <Toggle
                                        checked={prefs.reducedMotion}
                                        onChange={()=> setPrefs({...prefs, reducedMotion: !prefs.reducedMotion})}
                                        label="Reduced Motion"
                                    />
                                </div>
                            </Field>
                        </div>
                    </CustomCard>

                    <LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} onClick={handleSave} disabled={saving}>
                        {saving ? "Saving...": "Save Preferences"}
                    </LongButton>

                    {feedback && (
                        <p className={`text-center text-xs ${feedback.kind === "success" ? "text-[#3DBFA0]": "text-[#AC2A5D]"}`}>
                            {feedback.message}
                        </p>
                    )}
                </>
            )}
        </SubPageShell>
    )
}


function Field({
    label,
    children,
}: Readonly<{
    label: string
    children: React.ReactNode
}>) {
    return(
        <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#6B6375]">{label}</p>
            {children}
        </div>
    )
}

function PillOption({
    label,
    selected,
    onSelect,
}: Readonly <{
    label: string
    selected: boolean
    onSelect: ()=> void
}>) {
    return(
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${selected ? "bg-[#FFD8E6] text-[#AC2A5D]" : "bg-[#E3EAE6] text-[#6B6375] hover:text-[#091828]"}`}>
                {label}
        </button>
    )
}

export function Toggle({
    checked,
    onChange,
    label,
}: Readonly <{
    checked: boolean
    onChange:()=> void
    label: string
}>) {
    return(
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={onChange}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#AC2A5D]": "bg-[#E3EAE6]"}`}>

            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]": "left-0.5"}`} />
        </button>

    )
}