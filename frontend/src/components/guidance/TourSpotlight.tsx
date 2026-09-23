import type {SpotlightRect} from '@/hooks/useSpotlightRect'

export function TourSpotlight({rect,target}:{rect:SpotlightRect|null;target?:string}){
    if(!rect) return null

    return(
        <div
            aria-hidden="true"
            data-tour-highlight={target}
            className="pointer-events-none fixed z-40 rounded-2xl border-2 border-[#AC2A5D] dark:border-[#ff6b9d]"
            style={{
                top:rect.top-6,
                left:rect.left-6,
                width:rect.width+12,
                height:rect.height+12,
            }}
        />
    )
}