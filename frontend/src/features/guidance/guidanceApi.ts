import {apiFetch} from '@/lib/api'
import type {GuidanceDaily,GuidanceState,GuidanceStatePatch} from './guidanceTypes'

interface Envelope<T>{
    data:T
}

interface RequestOptions{
    signal?:AbortSignal
}

const DEFAULT_CODES:Record<number,string>={
    401:'UNAUTHENTICATED',
    422:'INVALID_GUIDANCE_STATE',
    503:'GUIDANCE_FACTS_UNAVAILABLE',
}

export class GuidanceApiError extends Error{
    readonly status:number
    readonly code:string

    constructor(status:number,code:string,message:string){
        super(message)
        this.name='GuidanceApiError'
        this.status=status
        this.code=code
    }

    get isFactsUnavailable():boolean{
        return this.code==='GUIDANCE_FACTS_UNAVAILABLE'||this.status===503
    }

    get isUnauthenticated():boolean{
        return this.code==='UNAUTHENTICATED'||this.status===401
    }
}

function isRecord(value:unknown):value is Record<string,unknown>{
    return typeof value==='object'&&value!==null
}

export function toGuidanceApiError(error:unknown):GuidanceApiError{
    if(error instanceof GuidanceApiError) return error

    const raw=isRecord(error)? error : {}
    const status=typeof raw.statusCode==='number'? raw.statusCode : 0
    const body=isRecord(raw.error)? raw.error : {}
    const code=(typeof body.code==='string'&&body.code)
        ||DEFAULT_CODES[status]
        ||'GUIDANCE_REQUEST_FAILED'
    const message=(typeof body.message==='string'&&body.message)
        ||(error instanceof Error? error.message : 'Guidance request failed.')

    return new GuidanceApiError(status,code,message)
}

export function normaliseState(payload:unknown):GuidanceState{
    const raw=isRecord(payload)? payload : {}
    const walkthrough=isRecord(raw.walkthrough)? raw.walkthrough : {}
    const status=walkthrough.status
    const step=walkthrough.currentStep
    const dismissed=Array.isArray(raw.dismissedTipIds)
        ? raw.dismissedTipIds.filter((id):id is string=>typeof id==='string')
        : []

    return{
        tipsEnabled:raw.tipsEnabled!==false,
        dailyExpansionEnabled:raw.dailyExpansionEnabled!==false,
        walkthrough:{
            status:status==='IN_PROGRESS'||status==='COMPLETED'||status==='SKIPPED'
                ? status
                : 'NOT_STARTED',
            currentStep:typeof step==='number'&&Number.isInteger(step)&&step>=0&&step<=4
                ? step
                : 0,
        },
        dismissedTipIds:Array.from(new Set(dismissed)),
        updatedAt:typeof raw.updatedAt==='string'? raw.updatedAt : null,
    }
}

export const DEFAULT_GUIDANCE_STATE:GuidanceState=normaliseState({})

export function isEmptyPatch(patch:GuidanceStatePatch):boolean{
    return Object.values(patch).every((value)=>value===undefined)
}

export async function getGuidanceState(options?:RequestOptions):Promise<GuidanceState>{
    try{
        const response=await apiFetch<Envelope<unknown>>('/guidance/state',{
            method:'GET',
            signal:options?.signal,
        })
        return normaliseState(response?.data)
    }catch(error){
        throw toGuidanceApiError(error)
    }
}

export async function patchGuidanceState(patch:GuidanceStatePatch):Promise<GuidanceState>{
    if(isEmptyPatch(patch)){
        throw new GuidanceApiError(422,'INVALID_GUIDANCE_STATE','A guidance update needs at least one field.')
    }
    try{
        const response=await apiFetch<Envelope<unknown>>('/guidance/state',{
            method:'PATCH',
            body:JSON.stringify(patch),
        })
        return normaliseState(response?.data)
    }catch(error){
        throw toGuidanceApiError(error)
    }
}

export async function getGuidanceDaily(options?:RequestOptions):Promise<GuidanceDaily>{
    try{
        const response=await apiFetch<Envelope<GuidanceDaily>>('/guidance/daily',{
            method:'GET',
            signal:options?.signal,
        })
        const daily=response?.data
        if(!daily) throw new GuidanceApiError(503,'GUIDANCE_FACTS_UNAVAILABLE','Unexpected response shape from /guidance/daily')
        return daily
    }catch(error){
        throw toGuidanceApiError(error)
    }
}

export interface GuidanceApi{
    getState(options?:RequestOptions):Promise<GuidanceState>
    patchState(patch:GuidanceStatePatch):Promise<GuidanceState>
    getDaily(options?:RequestOptions):Promise<GuidanceDaily>
}

export const guidanceApi:GuidanceApi={
    getState:getGuidanceState,
    patchState:patchGuidanceState,
    getDaily:getGuidanceDaily,
}