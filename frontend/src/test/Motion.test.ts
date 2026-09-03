import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'

import {
    applyReducedMotion,
    clearReducedMotion,
    getReducedMotion,
    initReducedMotion,
    setReducedMotion,
    systemPrefersReducedMotion,
} from '../lib/motion'

const KEY='spendsense_reduced_motion'

type MediaListener=(event: {matches: boolean})=> void

function mockMatchMedia(matches: boolean){
    const listeners: MediaListener[]=[]

    const media={
        matches,
        addEventListener: (_type: string, listener: MediaListener)=> {listeners.push(listener)},
        removeEventListener: vi.fn(),
    }

    vi.stubGlobal('matchMedia', vi.fn(()=> media))

    return {
        emit(next: boolean){
            media.matches=next
            listeners.forEach((listener)=> listener({matches: next}))
        },
    }
}

describe('lib/motion', ()=> {
    beforeEach(()=> {
        localStorage.clear()
        document.documentElement.classList.remove('reduce-motion')
    })

    afterEach(()=> {
        vi.unstubAllGlobals()
    })

    it('toggles the reduce-motion class on the document root', ()=> {
        applyReducedMotion(true)
        expect(document.documentElement).toHaveClass('reduce-motion')

        applyReducedMotion(false)
        expect(document.documentElement).not.toHaveClass('reduce-motion')
    })

    it('persists the choice and applies it immediately', ()=> {
        setReducedMotion(true)

        expect(localStorage.getItem(KEY)).toBe('true')
        expect(document.documentElement).toHaveClass('reduce-motion')

        setReducedMotion(false)

        expect(localStorage.getItem(KEY)).toBe('false')
        expect(document.documentElement).not.toHaveClass('reduce-motion')
    })

    it('falls back to the OS setting when the user has never chosen', ()=> {
        mockMatchMedia(true)
        expect(getReducedMotion()).toBe(true)

        mockMatchMedia(false)
        expect(getReducedMotion()).toBe(false)
    })

    it('lets an explicit choice override the OS setting in both directions', ()=> {
        mockMatchMedia(true)
        setReducedMotion(false)
        expect(getReducedMotion()).toBe(false)

        mockMatchMedia(false)
        setReducedMotion(true)
        expect(getReducedMotion()).toBe(true)
    })

    it('reports no OS preference when matchMedia is unavailable', ()=> {
        vi.stubGlobal('matchMedia', undefined)
        expect(systemPrefersReducedMotion()).toBe(false)
        expect(getReducedMotion()).toBe(false)
    })

    it('applies the stored value on init', ()=> {
        mockMatchMedia(false)
        localStorage.setItem(KEY,'true')

        initReducedMotion()

        expect(document.documentElement).toHaveClass('reduce-motion')
    })

    it('follows later OS changes only while the user has no explicit choice', ()=> {
        const media=mockMatchMedia(false)
        initReducedMotion()
        expect(document.documentElement).not.toHaveClass('reduce-motion')

        media.emit(true)
        expect(document.documentElement).toHaveClass('reduce-motion')

        setReducedMotion(false)
        media.emit(true)
        expect(document.documentElement).not.toHaveClass('reduce-motion')
    })

    it('returns to the OS setting when the stored choice is cleared', ()=> {
        mockMatchMedia(true)
        setReducedMotion(false)

        clearReducedMotion()

        expect(localStorage.getItem(KEY)).toBeNull()
        expect(document.documentElement).toHaveClass('reduce-motion')
    })
})