
import {act,renderHook,waitFor} from '@testing-library/react'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import {getSimulation} from '../features/simulation/api'
import {activeBoardFixture,completedFixture,eventRevealFixture} from '../features/simulation/fixtures/SimulationDetail'
import {useSimulation} from '../hooks/useSimulation'
import type {SimulationDetail} from '../features/simulation/types'

vi.mock('../features/simulation/api',()=>({
    getSimulation:vi.fn()
}))

const mockedGetSimulation=vi.mocked(getSimulation)

beforeEach(()=>{
    mockedGetSimulation.mockReset()
})

describe('useSimulation',()=>{
    it('loads the authoritative simulation state',async()=>{
        mockedGetSimulation.mockResolvedValue(activeBoardFixture)
        const {result}=renderHook(()=>useSimulation('sim_fixture_1'))
        expect(result.current.loading).toBe(true)
        expect(result.current.data).toBeNull()
        await waitFor(()=>{
            expect(result.current.loading).toBe(false)
        })
        expect(mockedGetSimulation).toHaveBeenCalledWith('sim_fixture_1')
        expect(result.current.data).toEqual(activeBoardFixture)
        expect(result.current.error).toBeNull()
    })

    it('does not fetch when no session id exists',async()=>{
        const {result}=renderHook(()=>useSimulation(null))
        expect(result.current.loading).toBe(false)
        expect(result.current.data).toBeNull()
        expect(result.current.error).toBeNull()
        expect(mockedGetSimulation).not.toHaveBeenCalled()
    })

    it('handles an initial loading failure',async()=>{
        mockedGetSimulation.mockRejectedValue(new Error('Simulation unavailable'))
        const {result}=renderHook(()=>useSimulation('sim_fixture_1'))
        await waitFor(()=>{
            expect(result.current.error).toBe('Simulation unavailable')
        })
        expect(result.current.data).toBeNull()
        expect(result.current.loading).toBe(false)
    })

    it('refetches and replaces state with the latest server response',async()=>{
        mockedGetSimulation
            .mockResolvedValueOnce(activeBoardFixture)
            .mockResolvedValueOnce(eventRevealFixture)
        const {result}=renderHook(()=>useSimulation('sim_fixture_1'))
        await waitFor(()=>{
            expect(result.current.data).toEqual(activeBoardFixture)
        })
        await act(async()=>{
            await result.current.refetch()
        })
        expect(mockedGetSimulation).toHaveBeenCalledTimes(2)
        expect(result.current.data).toEqual(eventRevealFixture)
        expect(result.current.error).toBeNull()
    })

    it('preserves confirmed state during a transient failure',async()=>{
        mockedGetSimulation
            .mockResolvedValueOnce(activeBoardFixture)
            .mockRejectedValueOnce(new Error('Network unavailable'))
        const {result}=renderHook(()=>useSimulation('sim_fixture_1'))
        await waitFor(()=>{
            expect(result.current.data).toEqual(activeBoardFixture)
        })
        await act(async()=>{
            await result.current.refetch()
        })
        expect(result.current.data).toEqual(activeBoardFixture)
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('Network unavailable')
    })

    it('recovers after a failed refetch',async()=>{
        mockedGetSimulation
            .mockResolvedValueOnce(activeBoardFixture)
            .mockRejectedValueOnce(new Error('Network unavailable'))
            .mockResolvedValueOnce(eventRevealFixture)
        const {result}=renderHook(()=>useSimulation('sim_fixture_1'))
        await waitFor(()=>{
            expect(result.current.data).toEqual(activeBoardFixture)
        })
        await act(async()=>{
            await result.current.refetch()
        })
        expect(result.current.error).toBe('Network unavailable')
        await act(async()=>{
            await result.current.refetch()
        })
        expect(result.current.data).toEqual(eventRevealFixture)
        expect(result.current.error).toBeNull()
    })

    it('replaces state after a successful mutation response',async()=>{
        mockedGetSimulation.mockResolvedValue(activeBoardFixture)
        const {result}=renderHook(()=>useSimulation('sim_fixture_1'))
        await waitFor(()=>{
            expect(result.current.data).toEqual(activeBoardFixture)
        })
        act(()=>{
            result.current.setSimulation(eventRevealFixture)
        })
        expect(result.current.data).toEqual(eventRevealFixture)
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
        expect(mockedGetSimulation).toHaveBeenCalledTimes(1)
    })

    it('ignores mutation responses belonging to another session',async()=>{
        mockedGetSimulation.mockResolvedValue(activeBoardFixture)
        const {result}=renderHook(()=>useSimulation('sim_fixture_1'))
        await waitFor(()=>{
            expect(result.current.data).toEqual(activeBoardFixture)
        })
        const otherSession:SimulationDetail={
            ...completedFixture,
            session:{
                ...completedFixture.session,
                id:'sim_fixture_2'
            }
        }
        act(()=>{
            result.current.setSimulation(otherSession)
        })
        expect(result.current.data).toEqual(activeBoardFixture)
    })

    it('does not allow an older refetch to overwrite newer server state',async()=>{
        let resolveRequest!:(value:SimulationDetail)=>void
        const pendingRequest=new Promise<SimulationDetail>(resolve=>{
            resolveRequest=resolve
        })
        mockedGetSimulation
            .mockResolvedValueOnce(activeBoardFixture)
            .mockReturnValueOnce(pendingRequest)
        const {result}=renderHook(()=>useSimulation('sim_fixture_1'))
        await waitFor(()=>{
            expect(result.current.data).toEqual(activeBoardFixture)
        })
        let refetchPromise!:Promise<SimulationDetail|null>
        act(()=>{
            refetchPromise=result.current.refetch()
        })
        await waitFor(()=>{
            expect(result.current.loading).toBe(true)
        })
        act(()=>{
            result.current.setSimulation(eventRevealFixture)
        })
        await act(async()=>{
            resolveRequest(activeBoardFixture)
            await refetchPromise
        })
        expect(result.current.data).toEqual(eventRevealFixture)
        expect(result.current.loading).toBe(false)
    })

    it('clears the previous session when the session id changes',async()=>{
        const secondSession:SimulationDetail={
            ...completedFixture,
            session:{
                ...completedFixture.session,
                id:'sim_fixture_2'
            }
        }
        mockedGetSimulation
            .mockResolvedValueOnce(activeBoardFixture)
            .mockResolvedValueOnce(secondSession)
        const {result,rerender}=renderHook(
            ({sessionId})=>useSimulation(sessionId),
            {
                initialProps:{
                    sessionId:'sim_fixture_1'
                }
            }
        )
        await waitFor(()=>{
            expect(result.current.data).toEqual(activeBoardFixture)
        })
        rerender({
            sessionId:'sim_fixture_2'
        })
        expect(result.current.data).not.toEqual(activeBoardFixture)
        await waitFor(()=>{
            expect(result.current.data).toEqual(secondSession)
        })
        expect(mockedGetSimulation).toHaveBeenCalledWith('sim_fixture_2')
    })

    it('does not apply an outdated response after unmounting',async()=>{
        let resolveRequest!:(value:SimulationDetail)=>void
        const pendingRequest=new Promise<SimulationDetail>(resolve=>{
            resolveRequest=resolve
        })
        mockedGetSimulation.mockReturnValue(pendingRequest)
        const {unmount}=renderHook(()=>useSimulation('sim_fixture_1'))
        await waitFor(()=>{
            expect(mockedGetSimulation).toHaveBeenCalledTimes(1)
        })
        unmount()
        await act(async()=>{
            resolveRequest(activeBoardFixture)
            await pendingRequest
        })
        expect(mockedGetSimulation).toHaveBeenCalledTimes(1)
    })
})