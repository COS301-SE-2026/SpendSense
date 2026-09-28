import {describe,expect,it} from 'vitest'
import {insightGuidanceFacts,pickGuidanceInsight} from '../features/guidance/insightGuidanceFacts'
import {calendarGuidanceFacts} from '../features/guidance/calendarGuidanceFacts'
import {selectGuide} from '../features/guidance/guidanceSelection'
import {GUIDANCE_CATALOGUE} from '../features/guidance/guidanceCatalogue'
import type {InsightCard} from '../features/insights/insightsApi'
import type {CalendarOccurrence} from '../hooks/useCalendarOccurrences'
import type {GuidanceSurface,GuideFacts} from '../features/guidance/guidanceTypes'

function insight(overrides:Partial<InsightCard>):InsightCard{
    return{
        key:'on-time-rate',
        title:'On-time payment rate',
        value:'92%',
        explanation:'11 of 12 eligible payments were on time.',
        severity:'positive',
        ...overrides,
    }
}

function occurrence(overrides:Partial<CalendarOccurrence>):CalendarOccurrence{
    return{
        id:'occ-1',
        dueDate:'2026-09-18T00:00:00.000Z',
        amountDue:250,
        currency:'ZAR',
        status:'PENDING',
        obligationName:'Rent',
        obligationType:'RENT',
        ...overrides,
    } as CalendarOccurrence
}

function chosen(surface:GuidanceSurface,facts:GuideFacts){
    return selectGuide(GUIDANCE_CATALOGUE,surface,facts,{
        route:'/insights',
        localDate:'2026-09-10',
        blocked:false,
        tipsEnabled:true,
        dismissedTipIds:[],
        walkthroughActive:false,
    })?.id??null
}

describe('insightGuidanceFacts',()=>{
    it('explains the most severe insight the API returned',()=>{
        const cards=[
            insight({key:'category-breakdown',severity:'info'}),
            insight({key:'upcoming-pressure',severity:'critical',value:'R2300'}),
            insight({key:'payment-streak',severity:'positive',value:'7 days'}),
        ]
        expect(pickGuidanceInsight(cards)?.key).toBe('upcoming-pressure')
        expect(chosen('insights',insightGuidanceFacts(cards,{loading:false,error:null})))
            .toBe('insights.upcoming-pressure.elevated')
    })

    it('separates a failed refresh from an empty result',()=>{
        expect(insightGuidanceFacts([],{loading:false,error:'boom'})).toEqual({insightsFailed:true})
        expect(insightGuidanceFacts([],{loading:false,error:null})).toEqual({insightsEmpty:true})
        expect(chosen('insights',insightGuidanceFacts([],{loading:false,error:'boom'})))
            .toBe('insights.request.failed')
    })

    it('says nothing while insights are still loading',()=>{
        expect(insightGuidanceFacts([],{loading:true,error:null})).toEqual({})
        expect(chosen('insights',insightGuidanceFacts([],{loading:true,error:null}))).toBeNull()
    })

    it('treats "Not enough data" as insufficient history rather than a rate',()=>{
        const facts=insightGuidanceFacts([insight({value:'Not enough data',severity:'info'})],{loading:false,error:null})
        expect(facts.hasEnoughHistory).toBe(false)
        expect(chosen('insights',facts)).toBe('insights.on-time-rate.insufficient')
    })

    it('carries the returned on-time rate into the card instead of recomputing it',()=>{
        const facts=insightGuidanceFacts([insight({value:'92%'})],{loading:false,error:null})
        expect(facts.insightValue).toBe('92%')
        const guide=selectGuide(GUIDANCE_CATALOGUE,'insights',facts,{
            route:'/insights',
            localDate:'2026-09-10',
            blocked:false,
            tipsEnabled:true,
            dismissedTipIds:[],
            walkthroughActive:false,
        })
        expect(guide?.text).toContain('92%')
        expect(guide?.text).toContain('not a real credit-bureau score')
    })

    it('leaves a streak card ineligible when the value carries no number',()=>{
        const facts=insightGuidanceFacts([insight({key:'payment-streak',value:'None yet'})],{loading:false,error:null})
        expect(facts.streak).toBeUndefined()
        expect(chosen('insights',facts)).toBeNull()
    })
})

describe('calendarGuidanceFacts',()=>{
    it('offers the empty-calendar card only when nothing is scheduled',()=>{
        const facts=calendarGuidanceFacts([],[],{loading:false,error:null})
        expect(facts.obligationCount).toBe(0)
        expect(chosen('calendar',facts)).toBe('calendar.empty.no-obligations')
    })

    it('flags an overdue occurrence in view',()=>{
        const overdue=occurrence({status:'OVERDUE'})
        const facts=calendarGuidanceFacts([overdue],[overdue],{loading:false,error:null})
        expect(chosen('calendar',facts)).toBe('calendar.overdue.explainer')
    })

    it('only names a due date when a single payable occurrence is in view',()=>{
        const one=occurrence({id:'a'})
        const two=occurrence({id:'b',dueDate:'2026-09-20T00:00:00.000Z'})

        const single=calendarGuidanceFacts([one],[one],{loading:false,error:null})
        expect(single.dueDate).toBeTruthy()
        expect(chosen('calendar',single)).toBe('calendar.occurrence.payable')

        const many=calendarGuidanceFacts([one,two],[one,two],{loading:false,error:null})
        expect(many.dueDate).toBeUndefined()
        expect(chosen('calendar',many)).toBeNull()
    })

    it('stays silent while the calendar is loading or broken',()=>{
        expect(calendarGuidanceFacts([],[],{loading:true,error:null})).toEqual({})
        expect(calendarGuidanceFacts([],[],{loading:false,error:'boom'})).toEqual({})
    })
})