const REDUCED_MOTION_KEY = 'spendsense_reduced_motion'
const REDUCED_MOTION_CLASS = 'reduce-motion'

export function systemPrefersReducedMotion(): boolean{
    if(!window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function applyReducedMotion(reduced: boolean): void{
    document.documentElement.classList.toggle(REDUCED_MOTION_CLASS, reduced)
}


export function getReducedMotion(): boolean{
    const saved = localStorage.getItem(REDUCED_MOTION_KEY)
    if(saved === 'true') return true
    if(saved === 'false') return false
    return systemPrefersReducedMotion()
}

export function setReducedMotion(reduced: boolean): void{
    localStorage.setItem(REDUCED_MOTION_KEY, String(reduced))
    applyReducedMotion(reduced)
}

export function clearReducedMotion(): void{
    localStorage.removeItem(REDUCED_MOTION_KEY)
    applyReducedMotion(systemPrefersReducedMotion())
}

export function initReducedMotion(): void{
    applyReducedMotion(getReducedMotion())

    if(!window.matchMedia) return

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',(event)=>{
        if(localStorage.getItem(REDUCED_MOTION_KEY) === null){
            applyReducedMotion(event.matches)
        }
    })
}