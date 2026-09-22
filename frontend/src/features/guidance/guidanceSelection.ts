import type {
    GuidanceSurface,
    GuidanceUiState,
    GuideCandidate,
    GuideFacts,
    GuideKind,
    SelectedGuide,
} from './guidanceTypes'

const KIND_RANK:Record<GuideKind,number>={
    walkthrough:4,
    result:3,
    urgent:2,
    ordinary:1,
}

const PLACEHOLDER_PATTERN=/\{([a-zA-Z0-9_]+)\}/g

export function interpolate(
    text:string,
    placeholders:readonly string[]|undefined,
    facts:GuideFacts,
):string|null{
    const declared=placeholders??[]
    let failed=false

    const filled=text.replace(PLACEHOLDER_PATTERN,(_match,name:string)=>{
        if(!declared.includes(name)){
            failed=true
            return ''
        }
        const value=facts[name]
        if(typeof value==='string'&&value.trim().length>0) return value
        if(typeof value==='number'&&Number.isFinite(value)) return String(value)
        failed=true
        return ''
    })

    return failed? null : filled
}

function isEligible(card:GuideCandidate,facts:GuideFacts):boolean{
    try{
        return card.eligible(facts)===true
    }catch{
        return false
    }
}

function isCoolingDown(card:GuideCandidate,ui:GuidanceUiState):boolean{
    if(!card.cooldownMs||!ui.shownAt) return false
    const shown=ui.shownAt.get(card.id)
    if(shown===undefined) return false
    const now=ui.now??Date.now()
    return now-shown<card.cooldownMs
}

function hash(value:string):number{
    let acc=5381
    for(let index=0;index<value.length;index+=1){
        acc=((acc<<5)+acc+value.charCodeAt(index))>>>0
    }
    return acc
}

export function selectGuide(
    catalogue:readonly GuideCandidate[],
    surface:GuidanceSurface,
    facts:GuideFacts,
    ui:GuidanceUiState,
):SelectedGuide|null{
    if(ui.walkthroughActive&&surface!=='walkthrough') return null
    if(ui.blocked) return null
    if(!ui.tipsEnabled&&!ui.manual) return null

    const dismissed=new Set(ui.dismissedTipIds)

    const eligible=catalogue
        .filter((card)=>card.surface===surface)
        .filter((card)=>!(card.dismissible&&dismissed.has(card.id)))
        .filter((card)=>!isCoolingDown(card,ui))
        .filter((card)=>isEligible(card,facts))
        .map((card)=>({card,text:interpolate(card.text,card.placeholders,facts)}))
        .filter((entry):entry is {card:GuideCandidate;text:string}=>entry.text!==null)

    if(eligible.length===0) return null

    eligible.sort((a,b)=>{
        const rank=KIND_RANK[b.card.kind]-KIND_RANK[a.card.kind]
        if(rank!==0) return rank
        const priority=b.card.priority-a.card.priority
        if(priority!==0) return priority
        return a.card.id.localeCompare(b.card.id)
    })

    const best=eligible[0].card
    const tied=eligible.filter((entry)=>entry.card.kind===best.kind&&entry.card.priority===best.priority)

    const rotation=hash(`${ui.route}|${ui.localDate}`)%tied.length
    const chosen=tied[rotation]

    return{
        id:chosen.card.id,
        surface:chosen.card.surface,
        kind:chosen.card.kind,
        text:chosen.text,
        dismissible:chosen.card.dismissible,
        actions:chosen.card.actions??[],
    }
}