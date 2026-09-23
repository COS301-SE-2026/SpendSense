export const JOHANNESBURG_TIME_ZONE='Africa/Johannesburg'

const DATE_FORMATTER=new Intl.DateTimeFormat('en-CA',{
    timeZone:JOHANNESBURG_TIME_ZONE,
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
})

export function johannesburgDate(date:Date=new Date()):string{
    return DATE_FORMATTER.format(date)
}

export const AUTO_EXPAND_KEY_PREFIX='guidance:auto-expanded:'

export function autoExpandKey(userId:string,localDate:string):string{
    return `${AUTO_EXPAND_KEY_PREFIX}${userId}:${localDate}`
}

function safeStorage(storage?:Storage|null):Storage|null{
    if(storage) return storage
    try{
        return typeof window==='undefined'? null : window.localStorage
    }catch{
        return null
    }
}

export function canAutoExpand(userId:string|null,localDate:string,storage?:Storage|null):boolean{
    if(!userId) return false
    const store=safeStorage(storage)
    if(!store) return true
    try{
        return store.getItem(autoExpandKey(userId,localDate))===null
    }catch{
        return true
    }
}

export function markAutoExpanded(userId:string|null,localDate:string,storage?:Storage|null):void{
    if(!userId) return
    const store=safeStorage(storage)
    if(!store) return
    try{
        store.setItem(autoExpandKey(userId,localDate),'1')
    }catch{
        //storage unavailable, automatic expansion simply repeats next visit
    }
}

export function clearAutoExpandMarkers(storage?:Storage|null):void{
    const store=safeStorage(storage)
    if(!store) return
    try{
        const doomed:string[]=[]
        for(let index=0;index<store.length;index+=1){
            const key=store.key(index)
            if(key?.startsWith(AUTO_EXPAND_KEY_PREFIX)) doomed.push(key)
        }
        doomed.forEach((key)=>store.removeItem(key))
    }catch{
        // nothing to clear
    }
}