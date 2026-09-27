import type {SpotlightRect} from '@/hooks/useSpotlightRect'

const PADDING=8
const RADIUS=16

function cutoutPath(rect:SpotlightRect){
    const w=window.innerWidth
    const h=window.innerHeight
    const x=rect.left-PADDING
    const y=rect.top-PADDING
    const width=rect.width+PADDING*2
    const height=rect.height+PADDING*2
    const r=Math.min(RADIUS,width/2,height/2)

    return `path(evenodd, 'M0 0 H${w} V${h} H0 Z `
        +`M${x+r} ${y} H${x+width-r} A${r} ${r} 0 0 1 ${x+width} ${y+r} `
        +`V${y+height-r} A${r} ${r} 0 0 1 ${x+width-r} ${y+height} `
        +`H${x+r} A${r} ${r} 0 0 1 ${x} ${y+height-r} `
        +`V${y+r} A${r} ${r} 0 0 1 ${x+r} ${y} Z')`
}

export function TourSpotlight({rect,target}:Readonly<{rect:SpotlightRect|null;target?:string}>){
    if(!rect) return null

    return(
        <>
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-[55] bg-[#091828]/35 backdrop-blur-[3px] dark:bg-black/55"
                style={{clipPath:cutoutPath(rect)}}
            />
            <div
                aria-hidden="true"
                data-tour-highlight={target}
                className="pointer-events-none fixed z-[55] rounded-2xl border-[3px] border-[#AC2A5D] shadow-[0_0_0_4px_rgba(255,217,225,0.9),0_0_28px_rgba(172,42,93,0.55)] motion-safe:transition-all motion-safe:duration-200 dark:border-[#ff6b9d] dark:shadow-[0_0_0_4px_rgba(255,107,157,0.25),0_0_28px_rgba(255,107,157,0.5)]"
                style={{
                    top:rect.top-PADDING,
                    left:rect.left-PADDING,
                    width:rect.width+PADDING*2,
                    height:rect.height+PADDING*2,
                }}
            />
        </>
    )
}
