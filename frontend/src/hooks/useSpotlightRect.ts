import {useEffect,useState} from 'react'

export interface SpotlightRect{
    top:number
    left:number
    width:number
    height:number
}

function findTarget(target:string|undefined):Element|null{
    if(!target||typeof document==='undefined') return null
    return document.querySelector(`[data-tour="${CSS.escape(target)}"]`)
}

function measure(target:string|undefined):SpotlightRect|null{
    const element=findTarget(target)
    if(!element) return null
    const rect=element.getBoundingClientRect()
    return {top:rect.top,left:rect.left,width:rect.width,height:rect.height}
}

export function useSpotlightRect(target:string|undefined,active:boolean):SpotlightRect|null{
    const [rect,setRect]=useState<SpotlightRect|null>(null)

    useEffect(()=>{
        if(!active||!target) return

        const element=findTarget(target)
        if(element&&typeof element.scrollIntoView==='function'){
            element.scrollIntoView({block:'center',behavior:'auto'})
        }

        const update=()=>setRect(measure(target))
        update()

        const timer=window.setTimeout(update,150)
        window.addEventListener('resize',update)
        window.addEventListener('scroll',update,true)

        return ()=>{
            window.clearTimeout(timer)
            window.removeEventListener('resize',update)
            window.removeEventListener('scroll',update,true)
        }
    },[target,active])

    return active&&target? rect : null
}