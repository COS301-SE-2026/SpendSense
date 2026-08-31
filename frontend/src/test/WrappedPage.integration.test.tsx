import React from "react"
import "@testing-library/jest-dom/vitest"
import {act,fireEvent,render,screen,waitFor} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest"
import WrappedPage from "../domains/WrappedPage"
import {getLatestWrapped} from "../features/profile/profileApi"

vi.mock("../features/profile/profileApi",()=>({
    getLatestWrapped:vi.fn(),
}))

vi.mock("framer-motion",()=>({
    AnimatePresence:({children}:{children:React.ReactNode})=><>{children}</>,
    motion:{
        div:({children,className}:{children?:React.ReactNode;className?:string})=><div className={className}>{children}</div>,
        section:({children,className}:{children?:React.ReactNode;className?:string})=><section className={className}>{children}</section>,
        h1:({children,className}:{children?:React.ReactNode;className?:string})=><h1 className={className}>{children}</h1>,
        p:({children,className}:{children?:React.ReactNode;className?:string})=><p className={className}>{children}</p>,
        button:({children,onClick,className,type}:{children?:React.ReactNode;onClick?:React.MouseEventHandler<HTMLButtonElement>;className?:string;type?:"button"|"submit"|"reset"})=>(
            <button type={type} onClick={onClick} className={className}>{children}</button>
        ),
    },
}))

vi.mock("../domains/IntroSlide",()=>({
    default:({monthLabel}:{monthLabel:string})=><div>Intro {monthLabel}</div>,
}))

vi.mock("../domains/ScoreSlide",()=>({
    default:({scoreStart,scoreEnd,scoreDelta,scoreTierEnd}:{
        scoreStart:number
        scoreEnd:number
        scoreDelta:number
        scoreTierEnd:string|null
    })=>(
        <div>
            Score {scoreStart} {scoreEnd} {scoreDelta} {scoreTierEnd}
        </div>
    ),
}))

vi.mock("../domains/paymentsSlide",()=>({
    default:({onTimePayments,latePayments,missedPayments,onTimePaymentRate}:{
        onTimePayments:number
        latePayments:number
        missedPayments:number
        onTimePaymentRate:number
    })=>(
        <div>
            Payments {onTimePayments} {latePayments} {missedPayments} {onTimePaymentRate}
        </div>
    ),
}))

vi.mock("../domains/StreakSlide",()=>({
    default:({longestPaymentStreakThisMonth}:{longestPaymentStreakThisMonth:number})=>(
        <div>Streak {longestPaymentStreakThisMonth}</div>
    ),
}))

vi.mock("../domains/BadgesSlide",()=>({
    default:({numberBadgesEarned,arrayBadgesEarned}:{
        numberBadgesEarned:number
        arrayBadgesEarned:Array<{name:string}>
    })=>(
        <div>
            Badges {numberBadgesEarned} {arrayBadgesEarned.map((badge)=>badge.name).join(" ")}
        </div>
    ),
}))

vi.mock("../domains/LearningSlide",()=>({
    default:({quizzesCompleted,knowledgeStreakEnd}:{
        quizzesCompleted:number
        knowledgeStreakEnd:number
    })=>(
        <div>Learning {quizzesCompleted} {knowledgeStreakEnd}</div>
    ),
}))

vi.mock("../domains/ShareSlide",()=>({
    default:({
        monthLabel,
        scoreDelta,
        onTimePaymentRate,
        longestPaymentStreakThisMonth,
        numberBadgesEarned,
        quizzesCompleted,
    }:{
        monthLabel:string
        scoreDelta:number
        onTimePaymentRate:number
        longestPaymentStreakThisMonth:number
        numberBadgesEarned:number
        quizzesCompleted:number
    })=>(
        <div>
            Share {monthLabel} {scoreDelta} {onTimePaymentRate} {longestPaymentStreakThisMonth} {numberBadgesEarned} {quizzesCompleted}
        </div>
    ),
}))

const mockedGetLatestWrapped=vi.mocked(getLatestWrapped)

const wrappedResponse={
    month:8,
    monthLabel:"August",
    scoreStart:642,
    scoreEnd:681,
    scoreDelta:39,
    scoreTierEnd:"GOOD",
    onTimePayments:3,
    latePayments:1,
    missedPayments:1,
    onTimePaymentRate:0.6,
    longestPaymentStreakThisMonth:2,
    numberBadgesEarned:2,
    arrayBadgesEarned:[
        {
            badgeKey:"FIRST_ON_TIME_PAYMENT",
            name:"On-Time Starter",
            iconKey:"check-circle",
            earnedAt:"2026-08-05T10:00:00.000Z",
        },{
            badgeKey:"THREE_PAYMENT_STREAK",
            name:"Three Payment Streak",
            iconKey:"flame",
            earnedAt:"2026-08-12T10:00:00.000Z",
        },
    ],
    coinsEarned:85,
    coinEvents:[],
    quizzesCompleted:2,
    knowledgeStreakEnd:0,
    hasData:true,
}

function renderWrapped(){
    return render(
        <MemoryRouter initialEntries={["/wrapped"]}>
            <WrappedPage/>
        </MemoryRouter>
    )
}

async function waitForIntro(){
    await waitFor(()=>{
        expect(screen.getByText("Intro August")).toBeInTheDocument()
    })
}

function next(){
    fireEvent.click(screen.getByRole("button",{name:"Next story"}))
}

function previous(){
    fireEvent.click(screen.getByRole("button",{name:"Previous story"}))
}

async function goToStory(story:number){
    renderWrapped()
    await waitForIntro()
    for(let index=1;index<story;index++){
        next()
    }
    await waitFor(()=>{
        expect(screen.getByText(`${story}/7`)).toBeInTheDocument()
    })
}

describe("WrappedPage",()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        mockedGetLatestWrapped.mockResolvedValue(wrappedResponse as never)
    })
    afterEach(()=>{
        vi.useRealTimers()
    })
    it("shows the loading state while Wrapped is loading",()=>{
        mockedGetLatestWrapped.mockReturnValue(new Promise(()=>{}))
        renderWrapped()
        expect(screen.getByText("Getting your Wrapped ready...")).toBeInTheDocument()
    })
    it("loads the latest Wrapped from the API",async()=>{
        await goToStory(1)
        expect(mockedGetLatestWrapped).toHaveBeenCalledTimes(1)
    })
    it("shows the request error separately from Wrapped data",async()=>{
        mockedGetLatestWrapped.mockRejectedValueOnce(new Error("Network error"))
        renderWrapped()
        await waitFor(()=>{
            expect(screen.getByText("Wrapped unavailable")).toBeInTheDocument()
        })
        expect(screen.getByText("Network error")).toBeInTheDocument()
        expect(screen.getByRole("button",{name:"Try again"})).toBeInTheDocument()
    })
    it("renders the month returned by the backend on the intro slide",async()=>{
        await goToStory(1)
        expect(screen.getByText("Intro August")).toBeInTheDocument()
    })
    it("passes score values to the score slide",async()=>{
        await goToStory(2)
        expect(screen.getByText("Score 642 681 39 GOOD")).toBeInTheDocument()
    })
    it("passes payment values to the payments slide",async()=>{
        await goToStory(3)
        expect(screen.getByText("Payments 3 1 1 0.6")).toBeInTheDocument()
    })
    it("passes the best payment streak to the streak slide",async()=>{
        await goToStory(4)
        expect(screen.getByText("Streak 2")).toBeInTheDocument()
    })
    it("passes earned badge data to the badges slide",async()=>{
        await goToStory(5)
        expect(screen.getByText(/Badges 2/)).toBeInTheDocument()
        expect(screen.getByText(/On-Time Starter/)).toBeInTheDocument()
        expect(screen.getByText(/Three Payment Streak/)).toBeInTheDocument()
    })
    it("passes quiz data to the learning slide",async()=>{
        await goToStory(6)
        expect(screen.getByText("Learning 2 0")).toBeInTheDocument()
    })
    it("passes the Wrapped summary to the share slide",async()=>{
        await goToStory(7)
        expect(screen.getByText("Share August 39 0.6 2 2 2")).toBeInTheDocument()
    })
    it("moves backward to the previous story",async()=>{
        await goToStory(2)
        previous()
        await waitFor(()=>{
            expect(screen.getByText("Intro August")).toBeInTheDocument()
        })
        expect(screen.getByText("1/7")).toBeInTheDocument()
    })
    it("disables previous navigation on the first story",async()=>{
        await goToStory(1)
        expect(screen.getByRole("button",{name:"Previous story"})).toBeDisabled()
    })
    it("disables next navigation on the final story",async()=>{
        await goToStory(7)
        expect(screen.getByRole("button",{name:"Next story"})).toBeDisabled()
    })
    it("auto advances after the intro duration",async()=>{
        vi.useFakeTimers()
        renderWrapped()
        await act(async()=>{
            await Promise.resolve()
        })
        expect(screen.getByText("Intro August")).toBeInTheDocument()
        act(()=>{
            vi.advanceTimersByTime(4500)
        })
        expect(screen.getByText("Score 642 681 39 GOOD")).toBeInTheDocument()
        expect(screen.getByText("2/7")).toBeInTheDocument()
    })
    it("does not auto advance past the final story",async()=>{
        await goToStory(7)
        expect(screen.getByRole("button",{name:"Next story"})).toBeDisabled()
        expect(screen.getByText("Share August 39 0.6 2 2 2")).toBeInTheDocument()
    })
})