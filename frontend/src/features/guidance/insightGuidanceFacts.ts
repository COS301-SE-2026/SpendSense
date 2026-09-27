import type {InsightCard,InsightSeverity} from '@/features/insights/insightsApi'
import type {GuideFacts} from './guidanceTypes'

const SEVERITY_RANK:Record<InsightSeverity,number>={
    critical:4,
    warning:3,
    info:2,
    positive:1,
}

const NOT_ENOUGH_DATA='Not enough data'

export function pickGuidanceInsight(insights:readonly InsightCard[]):InsightCard|null{
    if(insights.length===0) return null
    return [...insights].sort((a,b)=>SEVERITY_RANK[b.severity]-SEVERITY_RANK[a.severity])[0]
}

function leadingInteger(value:string):number|undefined{
    const match=/^\s*(\d+)/.exec(value)
    return match? Number(match[1]) : undefined
}

export function insightGuidanceFacts(
    insights:readonly InsightCard[],
    options:{loading:boolean;error:string|null},
):GuideFacts{
    if(options.error&&!options.loading) return {insightsFailed:true}
    if(options.loading) return {}
    if(insights.length===0) return {insightsEmpty:true}

    const card=pickGuidanceInsight(insights)
    if(!card) return {insightsEmpty:true}

    const facts:GuideFacts={
        insightKey:card.key,
        insightSeverity:card.severity,
        insightValue:card.value,
    }

    if(card.key==='on-time-rate'){
        facts.hasEnoughHistory=card.value!==NOT_ENOUGH_DATA
    }

    if(card.key==='payment-streak'){
        facts.streak=leadingInteger(card.value)
    }

    if(card.key==='obligation-trend'){
        facts.insightDirection=card.severity==='warning'||card.severity==='critical'
            ? 'increase'
            : 'steady'
    }

    return facts
}