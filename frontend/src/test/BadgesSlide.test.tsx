import React from "react"
import "@testing-library/jest-dom/vitest"
import {render,screen} from "@testing-library/react"
import {describe,expect,it,vi} from "vitest"
import BadgesSlide from "../domains/BadgesSlide"

vi.mock("framer-motion",()=>({
    motion:{
        div:({children,className}:{children?:React.ReactNode;className?:string})=><div className={className}>{children}</div>,
        h1:({children,className}:{children?:React.ReactNode;className?:string})=><h1 className={className}>{children}</h1>,
        p:({children,className}:{children?:React.ReactNode;className?:string})=><p className={className}>{children}</p>,
    },
}))

vi.mock("@/components/ui/sticker",()=>({
    Sticker:({children,"aria-label":ariaLabel}:{
        children?:React.ReactNode
        "aria-label"?:string
    })=>(
        <div aria-label={ariaLabel}>
            {children}
        </div>
    ),
}))

const badges=[
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
]

describe("BadgesSlide",()=>{
    it("shows the number of badges earned",()=>{
        render(
            <BadgesSlide
                numberBadgesEarned={2}
                arrayBadgesEarned={badges as never}
            />
        )
        expect(screen.getByText("2 new badges unlocked")).toBeInTheDocument()
    })
    it("shows the actual badges earned",()=>{
        render(
            <BadgesSlide
                numberBadgesEarned={2}
                arrayBadgesEarned={badges as never}
            />
        )
        expect(screen.getByText("On-Time Starter")).toBeInTheDocument()
        expect(screen.getByText("Three Payment Streak")).toBeInTheDocument()
    })
    it("uses the badge names for the sticker labels",()=>{
        render(
            <BadgesSlide
                numberBadgesEarned={2}
                arrayBadgesEarned={badges as never}
            />
        )
        expect(screen.getAllByLabelText("On-Time Starter").length).toBeGreaterThan(0)
        expect(screen.getAllByLabelText("Three Payment Streak").length).toBeGreaterThan(0)
    })
    it("shows the empty state when no badges were earned",()=>{
        render(
            <BadgesSlide
                numberBadgesEarned={0}
                arrayBadgesEarned={[]}
            />
        )
        expect(screen.getByText("No new badges")).toBeInTheDocument()
    })
    it("uses singular badge wording",()=>{
        render(
            <BadgesSlide
                numberBadgesEarned={1}
                arrayBadgesEarned={[badges[0]] as never}
            />
        )
        expect(screen.getByText("1 new badge unlocked")).toBeInTheDocument()
    })
})