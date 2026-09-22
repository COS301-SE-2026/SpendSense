import type {CurrencyTotal} from './guidanceTypes'

const SYMBOLS:Record<string,string>={
    ZAR:'R',
}

function groupThousands(amount:string):string{
    const negative=amount.startsWith('-')
    const bare=negative? amount.slice(1) : amount
    const [whole,fraction='00']=bare.split('.')
    const grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,' ')
    return `${negative? '-' : ''}${grouped}.${fraction}`
}

export function formatCurrencyTotal(total:CurrencyTotal):string{
    const symbol=SYMBOLS[total.currency]
    const amount=groupThousands(total.amount)
    return symbol? `${symbol}${amount}` : `${total.currency} ${amount}`
}


export function formatCurrencyTotals(totals:readonly CurrencyTotal[]|undefined):string|undefined{
    if(!totals||totals.length===0) return undefined
    const parts=totals.map(formatCurrencyTotal)
    if(parts.length===1) return parts[0]
    return `${parts.slice(0,-1).join(', ')} and ${parts[parts.length-1]}`
}