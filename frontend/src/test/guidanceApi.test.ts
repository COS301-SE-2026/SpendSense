import {describe,expect,it,vi,beforeEach} from 'vitest'
import {apiFetch} from '../lib/api'
import {
    GuidanceApiError,
    getGuidanceDaily,
    getGuidanceState,
    normaliseState,
    patchGuidanceState,
} from '../features/guidance/guidanceApi'

vi.mock('@/lib/api',()=>({
    apiFetch:vi.fn(),
}))

const mockedApiFetch=vi.mocked(apiFetch)

function apiError(statusCode:number,code?:string,message='failed'){
    return Object.assign(new Error(message),{
        statusCode,
        error:code? {statusCode,code,message} : {message},
    })
}

beforeEach(()=>{
    mockedApiFetch.mockReset()
})

describe('guidanceApi',()=>{
    it('unwraps the data envelope on GET /guidance/state',async()=>{
        mockedApiFetch.mockResolvedValueOnce({
            data:{
                tipsEnabled:true,
                dailyExpansionEnabled:false,
                walkthrough:{status:'IN_PROGRESS',currentStep:2},
                dismissedTipIds:['calendar.overdue.explainer'],
                updatedAt:'2026-09-10T10:00:00.000Z',
            },
        })

        const state=await getGuidanceState()

        expect(mockedApiFetch).toHaveBeenCalledWith('/guidance/state',expect.objectContaining({method:'GET'}))
        expect(state.dailyExpansionEnabled).toBe(false)
        expect(state.walkthrough).toEqual({status:'IN_PROGRESS',currentStep:2})
        expect(state.dismissedTipIds).toEqual(['calendar.overdue.explainer'])
    })

    it('rejects an empty patch before it reaches the network',async()=>{
        await expect(patchGuidanceState({})).rejects.toBeInstanceOf(GuidanceApiError)
        expect(mockedApiFetch).not.toHaveBeenCalled()
    })

    it('sends a JSON patch body',async()=>{
        mockedApiFetch.mockResolvedValueOnce({data:{tipsEnabled:false}})

        await patchGuidanceState({tipsEnabled:false})

        expect(mockedApiFetch).toHaveBeenCalledWith('/guidance/state',{
            method:'PATCH',
            body:JSON.stringify({tipsEnabled:false}),
        })
    })

    it('surfaces the machine code for a rejected patch',async()=>{
        mockedApiFetch.mockRejectedValueOnce(apiError(422,'INVALID_GUIDANCE_STATE','Unknown tip id.'))

        await expect(patchGuidanceState({dismissTipId:'nope'})).rejects.toMatchObject({
            status:422,
            code:'INVALID_GUIDANCE_STATE',
        })
    })

    it('marks a 503 on the daily projection as facts unavailable',async()=>{
        mockedApiFetch.mockRejectedValueOnce(apiError(503,'GUIDANCE_FACTS_UNAVAILABLE'))

        await expect(getGuidanceDaily()).rejects.toSatisfy(
            (error)=>(error as GuidanceApiError).isFactsUnavailable,
        )
    })

    it('marks a 401 as unauthenticated even without a body code',async()=>{
        mockedApiFetch.mockRejectedValueOnce(apiError(401))

        await expect(getGuidanceState()).rejects.toSatisfy(
            (error)=>(error as GuidanceApiError).isUnauthenticated,
        )
    })

    it('treats a missing daily payload as unavailable rather than an empty day',async()=>{
        mockedApiFetch.mockResolvedValueOnce({})

        await expect(getGuidanceDaily()).rejects.toSatisfy(
            (error)=>(error as GuidanceApiError).isFactsUnavailable,
        )
    })
})

describe('normaliseState',()=>{
    it('clamps an out-of-range step and drops unknown statuses',()=>{
        const state=normaliseState({
            walkthrough:{status:'WEIRD',currentStep:9},
            dismissedTipIds:['a','a',4],
        })
        expect(state.walkthrough).toEqual({status:'NOT_STARTED',currentStep:0})
        expect(state.dismissedTipIds).toEqual(['a'])
    })

    it('returns usable defaults for a lazily created row',()=>{
        expect(normaliseState({})).toEqual({
            tipsEnabled:true,
            dailyExpansionEnabled:true,
            walkthrough:{status:'NOT_STARTED',currentStep:0},
            dismissedTipIds:[],
            updatedAt:null,
        })
    })
})