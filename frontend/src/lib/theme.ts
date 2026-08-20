const THEME_KEY ='spendsense_theme'

export type Theme= 'SYSTEM'|'LIGHT'|'DARK'

function systemPrefersDark(): boolean{
    if(!window.matchMedia) return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme: Theme): void{
    const root=document.documentElement
    const useDark= theme === 'DARK' || (theme === 'SYSTEM' && systemPrefersDark())
    if(useDark){
        root.classList.add('dark')
    }else{
        root.classList.remove('dark')
    }
}

export function getTheme(): Theme{
    const saved=localStorage.getItem(THEME_KEY)
    if(saved === 'LIGHT' || saved === 'DARK' || saved === 'SYSTEM'){
        return saved
    }
    return 'LIGHT'
}

export function setTheme(theme: Theme): void{
    localStorage.setItem(THEME_KEY,theme)
    applyTheme(theme)
}

export function initTheme(): void{
    applyTheme(getTheme())

    if(!window.matchMedia) return

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
        if(getTheme() === 'SYSTEM'){
            applyTheme('SYSTEM')
        }
    })
}