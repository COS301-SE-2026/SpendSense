export type SocialResource='friends'|'friendRequests'|'leaderboard'|'wagers'

type Listener=()=>void

const listeners:Record<SocialResource,Set<Listener>>={
    friends:new Set(),
    friendRequests:new Set(),
    leaderboard:new Set(),
    wagers:new Set(),
}

export function subscribeSocialInvalidation(resource:SocialResource,listener:Listener){
    listeners[resource].add(listener)
    return()=>{
        listeners[resource].delete(listener)
    }
}

export function invalidateSocial(...resources:SocialResource[]){
    resources.forEach((resource)=>{
        listeners[resource].forEach((listener)=>listener())
    })
}