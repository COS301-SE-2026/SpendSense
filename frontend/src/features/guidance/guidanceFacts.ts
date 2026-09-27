import type {GuideFacts} from './guidanceTypes'

export function factNumber(facts:GuideFacts,key:string):number|undefined{
    const value=facts[key]
    return typeof value==='number'&&Number.isFinite(value)? value : undefined
}

export function factString(facts:GuideFacts,key:string):string|undefined{
    const value=facts[key]
    return typeof value==='string'&&value.length>0? value : undefined
}

export function factBoolean(facts:GuideFacts,key:string):boolean|undefined{
    const value=facts[key]
    return typeof value==='boolean'? value : undefined
}

export function isTrue(facts:GuideFacts,key:string):boolean{
    return factBoolean(facts,key)===true
}

export function isFalse(facts:GuideFacts,key:string):boolean{
    return factBoolean(facts,key)===false
}

export function numberEquals(facts:GuideFacts,key:string,expected:number):boolean{
    return factNumber(facts,key)===expected
}

export function numberAbove(facts:GuideFacts,key:string,threshold:number):boolean{
    const value=factNumber(facts,key)
    return value!==undefined&&value>threshold
}

export function stringEquals(facts:GuideFacts,key:string,expected:string):boolean{
    return factString(facts,key)===expected
}

export function stringIn(facts:GuideFacts,key:string,expected:readonly string[]):boolean{
    const value=factString(facts,key)
    return value!==undefined&&expected.includes(value)
}