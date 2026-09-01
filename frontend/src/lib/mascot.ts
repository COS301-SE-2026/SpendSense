export type MascotMood = "HAPPY" | "NEUTRAL" | "STRESSED" | "SAD" | "CELEBRATING"

export const XP_PER_LEVEL = 100

export function calculateMascotLevel(xp: number): number{
    if(!Number.isFinite(xp) || xp < 0) return 1
    return 1 + Math.floor(xp / XP_PER_LEVEL)
}

export interface MascotLevelProgress{
    currentLevelXp: number
    xpForNextLevel: number
    percentToNextLevel: number
}

export function calculateLevelProgress(xp: number): MascotLevelProgress{
    const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0
    const currentLevelXp = safeXp % XP_PER_LEVEL
    return{
        currentLevelXp,
        xpForNextLevel: XP_PER_LEVEL,
        percentToNextLevel: currentLevelXp,
    }
}

export interface MoodMeta{
    label: string
    line: string
    tone: "pink" | "mint" | "yellow" | "lilac" | "slate"
}

export const MOOD_META: Record<MascotMood, MoodMeta> ={
    CELEBRATING: {
        label: "Celebrating",
        line: "Look at you go!",
        tone: "yellow",
    },
    HAPPY: {
        label: "Happy",
        line: "I'm doing great!",
        tone: "mint",
    },
    NEUTRAL: {
        label: "Settled",
        line: "All quiet here.",
        tone: "lilac",
    },
    STRESSED: {
        label: "Stressed",
        line: "That one was close.",
        tone: "pink",
    },
    SAD: {
        label: "Sad",
        line: "We can get back on track.",
        tone: "slate",
    },
}

export function moodMetaFor(mood: string | null | undefined): MoodMeta{
    if(mood && mood in MOOD_META){
        return MOOD_META[mood as MascotMood]
    }
    return MOOD_META.NEUTRAL
}
 
export function isMascotMood(mood: string | null | undefined): mood is MascotMood{
    return !!mood && mood in MOOD_META
}