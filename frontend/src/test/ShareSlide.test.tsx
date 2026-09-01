import React from "react"
import "@testing-library/jest-dom/vitest"
import {fireEvent,render,screen,waitFor} from "@testing-library/react"
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest"
import ShareSlide from "../domains/ShareSlide"
import {toPng} from "html-to-image"

vi.mock("html-to-image",()=>({
    toPng:vi.fn(),
}))

vi.mock("@/components/SpendSenseLogoLight.svg",()=>({
    default:"SpendSenseLogoLight.svg",
}))

vi.mock("framer-motion",()=>({
    motion:{
        div:({children,className}:{children?:React.ReactNode;className?:string})=><div className={className}>{children}</div>,
        p:({children,className}:{children?:React.ReactNode;className?:string})=><p className={className}>{children}</p>,
    },
}))

const mockedToPng=vi.mocked(toPng)

const props={
    monthLabel:"August",
    scoreDelta:39,
    onTimePaymentRate:0.6,
    longestPaymentStreakThisMonth:2,
    numberBadgesEarned:2,
    quizzesCompleted:2,
}

const originalShare=navigator.share
const originalCanShare=navigator.canShare
const originalFetch=globalThis.fetch

function renderShare(){
    return render(
        <ShareSlide
            monthLabel={props.monthLabel}
            scoreDelta={props.scoreDelta}
            onTimePaymentRate={props.onTimePaymentRate}
            longestPaymentStreakThisMonth={props.longestPaymentStreakThisMonth}
            numberBadgesEarned={props.numberBadgesEarned}
            quizzesCompleted={props.quizzesCompleted}
        />
    )
}

describe("ShareSlide",()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        mockedToPng.mockResolvedValue("data:image/png;base64,test")
        Object.defineProperty(document,"fonts",{
            configurable:true,
            value:{
                ready:Promise.resolve(),
            },
        })
        vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{
            return window.setTimeout(()=>{
                callback(performance.now()+1000)
            },0)
        })
        vi.stubGlobal("cancelAnimationFrame",(id:number)=>{
            window.clearTimeout(id)
        })
    })
    afterEach(()=>{
        Object.defineProperty(navigator,"share",{
            configurable:true,
            value:originalShare,
        })
        Object.defineProperty(navigator,"canShare",{
            configurable:true,
            value:originalCanShare,
        })
        globalThis.fetch=originalFetch
        vi.unstubAllGlobals()
    })
    it("shows the Wrapped month",()=>{
        renderShare()
        expect(screen.getByText("August")).toBeInTheDocument()
        expect(screen.getByText("Wrapped.")).toBeInTheDocument()
    })
    it("shows the share and save buttons",()=>{
        renderShare()
        expect(screen.getByRole("button",{name:"Share image"})).toBeInTheDocument()
        expect(screen.getByRole("button",{name:"Save image"})).toBeInTheDocument()
    })
    it("converts the payment rate to a percentage",async()=>{
        renderShare()
        await waitFor(()=>{
            expect(screen.getByText("60%")).toBeInTheDocument()
        })
    })
    it("shows the score movement",async()=>{
        renderShare()
        await waitFor(()=>{
            expect(screen.getByText("+39")).toBeInTheDocument()
        })
    })
    it("shows the streak badge and quiz values",async()=>{
        renderShare()
        await waitFor(()=>{
            expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2)
        })
        expect(screen.getByText("Best streak")).toBeInTheDocument()
        expect(screen.getByText("Badges")).toBeInTheDocument()
        expect(screen.getByText("Quizzes")).toBeInTheDocument()
    })
    it("creates an image when save is clicked",async()=>{
        const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{})
        renderShare()
        fireEvent.click(screen.getByRole("button",{name:"Save image"}))
        await waitFor(()=>{
            expect(mockedToPng).toHaveBeenCalledTimes(1)
        })
        expect(mockedToPng).toHaveBeenCalledWith(
            expect.any(HTMLElement),
            expect.objectContaining({
                cacheBust:true,
                pixelRatio:3,
                backgroundColor:"#F4FBF7",
            }),
        )
        await waitFor(()=>{
            expect(click).toHaveBeenCalledTimes(1)
        })
        click.mockRestore()
    })
    it("uses the correct filename when saving",async()=>{
        let filename=""
        const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(function(){
            filename=this.download
        })
        renderShare()
        fireEvent.click(screen.getByRole("button",{name:"Save image"}))
        await waitFor(()=>{
            expect(click).toHaveBeenCalledTimes(1)
        })
        expect(filename).toBe("SpendSense-August-Wrapped.png")
        click.mockRestore()
    })
    it("uses native sharing when it is supported",async()=>{
        const share=vi.fn().mockResolvedValue(undefined)
        const canShare=vi.fn().mockReturnValue(true)
        Object.defineProperty(navigator,"share",{
            configurable:true,
            value:share,
        })
        Object.defineProperty(navigator,"canShare",{
            configurable:true,
            value:canShare,
        })
        globalThis.fetch=vi.fn().mockResolvedValue({
            blob:vi.fn().mockResolvedValue(
                new Blob(["image"],{type:"image/png"})
            ),
        } as unknown as Response)
        renderShare()
        fireEvent.click(screen.getByRole("button",{name:"Share image"}))
        await waitFor(()=>{
            expect(share).toHaveBeenCalledTimes(1)
        })
        expect(canShare).toHaveBeenCalledTimes(1)
        expect(share).toHaveBeenCalledWith(
            expect.objectContaining({
                title:"August Wrapped",
                text:"My SpendSense Monthly Wrapped",
                files:expect.any(Array),
            }),
        )
        const shareOptions=share.mock.calls[0][0]
        expect(shareOptions.files).toHaveLength(1)
        expect(shareOptions.files[0].name).toBe("SpendSense-August-Wrapped.png")
        expect(shareOptions.files[0].type).toBe("image/png")
    })
    it("downloads the image when native sharing is unavailable",async()=>{
        const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{})
        Object.defineProperty(navigator,"share",{
            configurable:true,
            value:undefined,
        })
        Object.defineProperty(navigator,"canShare",{
            configurable:true,
            value:undefined,
        })
        globalThis.fetch=vi.fn().mockResolvedValue({
            blob:vi.fn().mockResolvedValue(
                new Blob(["image"],{type:"image/png"})
            ),
        } as unknown as Response)
        renderShare()
        fireEvent.click(screen.getByRole("button",{name:"Share image"}))
        await waitFor(()=>{
            expect(click).toHaveBeenCalledTimes(1)
        })
        expect(mockedToPng).toHaveBeenCalledTimes(1)
        click.mockRestore()
    })
})