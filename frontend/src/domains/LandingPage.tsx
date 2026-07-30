import * as React from "react"
import {Link} from "react-router-dom"
import logo from "@/components/SpendSenseLogoLight.svg"
import dashboardImg from "@/assets/landing/dashboard.png"
import calendarImg from "@/assets/landing/calendar.png"
import questsImg from "@/assets/landing/quests.png"
import insightsImg from "@/assets/landing/insights.png"

const container = "w-[min(1120px,calc(100%-48px))] mx-auto"
const button =
    "inline-flex items-center justify-center gap-[11px] px-[21px] py-[15px] border-2 border-[#091828] rounded-full text-sm font-extrabold shadow-[4px_5px_0_#091828] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
const sectionHeading =
    "text-[clamp(37px,4.5vw,61px)] font-black tracking-[-2.3px] leading-[1.02] max-[640px]:tracking-[-1.9px]"

const BRAND_GUIDE_URL = "https://cos301-se-2026.github.io/SpendSense/"

export default function LandingPage(){
    const [menuOpen, setMenuOpen] = React.useState(false)

    return (
        <div className="min-h-screen bg-[#F4FBF7] text-[#091828] leading-[1.5]">
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-[10px] focus:left-[10px] focus:px-[13px] focus:py-[10px] focus:rounded-lg focus:bg-[#091828] focus:text-white"
                href="#main-content"
            >
                Skip to content
            </a>

            <header className="absolute inset-x-0 top-0 z-10" id="top">
                <nav className={`${container} flex items-center justify-between h-[93px]`} aria-label="Primary navigation">
                    <a href="#top" className="block w-[178px]" aria-label="SpendSense home">
                        <img src={logo} alt="SpendSense" className="block w-full h-auto" />
                    </a>

                    <button
                        className="sm:hidden flex flex-col gap-1 p-[7px] bg-transparent border-0 cursor-pointer"
                        type="button"
                        aria-expanded={menuOpen}
                        aria-controls="nav-links"
                        onClick={()=> setMenuOpen((open)=> !open)}
                    >
                        <span className={`block w-[23px] h-[2px] bg-[#091828] transition-transform duration-200 ${menuOpen ? "translate-y-[6px] rotate-45" : ""}`} />
                        <span className={`block w-[23px] h-[2px] bg-[#091828] transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
                        <span className={`block w-[23px] h-[2px] bg-[#091828] transition-transform duration-200 ${menuOpen ? "-translate-y-[6px] -rotate-45" : ""}`} />
                        <span className="sr-only">Open menu</span>
                    </button>

                    <div
                        id="nav-links"
                        className={`${menuOpen ? "flex" : "hidden"} sm:flex flex-col sm:flex-row items-stretch sm:items-center gap-[3px] sm:gap-[30px] text-sm font-extrabold absolute sm:static top-[65px] sm:top-auto right-4 sm:right-auto left-4 sm:left-auto p-3 sm:p-0 rounded-2xl sm:rounded-none border-[1.5px] sm:border-0 border-[#091828] bg-white sm:bg-transparent shadow-[4px_5px_0_#091828] sm:shadow-none`}
                    >
                        <a className="px-2 py-2 sm:p-0 hover:text-[#AC2A5D]" href="#how-it-works" onClick={()=> setMenuOpen(false)}>How it works</a>
                        <a className="px-2 py-2 sm:p-0 hover:text-[#AC2A5D]" href="#app" onClick={()=> setMenuOpen(false)}>Inside the app</a>
                        <a className="px-2 py-2 sm:p-0 hover:text-[#AC2A5D]" href={BRAND_GUIDE_URL} target="_blank" rel="noreferrer">Brand guide</a>
                        <Link
                            className="px-[17px] py-[10px] border-2 border-[#091828] rounded-full bg-white shadow-[3px_3px_0_#091828] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none text-center"
                            to="/register"
                            onClick={()=> setMenuOpen(false)}
                        >
                            Get started
                        </Link>
                    </div>
                </nav>
            </header>

            <main id="main-content">
                <section className="pt-[155px] pb-[82px] max-[640px]:pt-[119px] max-[640px]:pb-[70px]">
                    <div className={`${container} grid grid-cols-[1fr_0.82fr] gap-24 items-center max-[850px]:grid-cols-1 max-[850px]:gap-[45px]`}>
                        <div>
                            <span className="inline-block rounded-full text-[11px] font-extrabold tracking-[0.35px] px-[11px] py-[7px] bg-[#FFD8E6] text-[#AC2A5D]">
                                For students trying to figure things out
                            </span>
                            <h1 className="mt-4 mb-[22px] text-[clamp(49px,5.7vw,75px)] font-black tracking-[-3.4px] leading-[0.97] max-[640px]:tracking-[-1.9px]">
                                Know where your money is<br />actually going.
                            </h1>
                            <p className="max-w-[500px] mb-[27px] text-[#6B6375] text-lg leading-[1.6] max-[640px]:mb-[22px] max-[640px]:text-base">
                                Know what you're spending on, stay ahead of bills, and actually build lasting habits.
                            </p>
                            <div className="flex gap-[15px] flex-wrap max-[640px]:flex-col max-[640px]:items-start">
                                <a className={`${button} bg-[#FF6B9D] text-[#500D26]`} href="#how-it-works">See how it works <span>↓</span></a>
                                <a className={`${button} bg-white`} href="#app">Explore the app</a>
                            </div>
                        </div>

                        <div className="relative justify-self-center">
                            <div className="w-[282px] p-[9px] border-2 border-[#091828] rounded-[30px] bg-[#091828] shadow-[11px_12px_0_#FFD8E6] max-[640px]:w-[252px]">
                                <img
                                    src={dashboardImg}
                                    alt="The SpendSense home dashboard showing credit score, quests, upcoming payments and spending information."
                                    className="block w-full rounded-[20px]"
                                />
                            </div>
                            <span className="absolute right-[-57px] bottom-9 px-[11px] py-2 border-[1.5px] border-[#091828] rounded-[9px] bg-[#FFDC8A] shadow-[3px_4px_0_#091828] text-[11px] font-extrabold -rotate-[4deg] max-[640px]:right-[-28px] max-[640px]:bottom-[25px]">
                                Your financial home
                            </span>
                        </div>
                    </div>
                </section>

                <section className="pb-[70px] max-[640px]:pb-[50px]">
                    <div className={container}>
                        <p className="max-w-[640px] mx-auto text-center text-xs text-[#6B6375] leading-[1.6]">
                            A note on the credit score: real credit bureau algorithms are proprietary. SpendSense uses educational approximations based on published consumer guidance, great for learning how scoring behaves, but not the exact formulas any bureau runs.
                        </p>
                    </div>
                </section>

                <section className="py-[92px] bg-white max-[640px]:py-[70px]" id="how-it-works">
                    <div className={`${container} max-w-[760px]`}>
                        <h2 className={sectionHeading}>Things that actually matter.</h2>
                    </div>

                    <div className={`${container} grid grid-cols-3 gap-[25px] mt-[55px] max-[640px]:grid-cols-1 max-[640px]:gap-[15px] max-[640px]:mt-[35px]`}>
                        {[
                            {n: "01", title: "See what's coming", body: "Rent, subscriptions, that BNPL you forgot about. All in one place."},
                            {n: "02", title: "Feel the progress", body: "Log a payment, finish a quest, and watch your streak climb."},
                            {n: "03", title: "Understand your spending", body: "See where your money is actually going and why your score moved."},
                        ].map((item)=> (
                            <article key={item.n} className="grid grid-cols-[42px_1fr] gap-[14px] pt-4 border-t-2 border-[#091828]">
                                <div className="grid place-items-center w-8 h-8 rounded-full bg-[#DCEFE8] text-[10px] font-black">{item.n}</div>
                                <div>
                                    <h3 className="mt-1 mb-2 text-lg tracking-[-0.4px]">{item.title}</h3>
                                    <p className="text-[#6B6375] text-[13px] leading-[1.55]">{item.body}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="py-24 bg-[#F4FBF7] max-[640px]:py-[70px]" id="app">
                    <div className={`${container} flex items-end justify-between gap-10 pb-[33px] border-b-2 border-[#091828] max-[640px]:block max-[640px]:pb-[25px]`}>
                        <h2 className={sectionHeading}>Inside SpendSense</h2>
                        <p className="max-w-[340px] text-[#6B6375] text-[15px] max-[640px]:mt-3 max-[640px]:max-w-none">
                            Built around what you are already trying to do.
                        </p>
                    </div>

                    <div className={`${container} grid`}>
                        <article className="grid grid-cols-[1fr_285px] gap-[125px] items-start py-[69px] px-[65px] border-b-[1.5px] border-[#C9DBD3] max-[850px]:grid-cols-[1fr_240px] max-[850px]:gap-[50px] max-[850px]:py-[55px] max-[850px]:px-[30px] max-[640px]:grid-cols-1 max-[640px]:gap-[31px] max-[640px]:py-[47px] max-[640px]:px-0">
                            <div className="max-w-[495px] pt-16 max-[640px]:pt-0">
                                <span className="inline-block rounded-full text-[11px] font-extrabold tracking-[0.35px] px-[9px] py-[5px] bg-[#72CDBC]">Plan</span>
                                <h3 className="mt-[13px] mb-3 text-[31px] font-black tracking-[-1.35px] leading-[1.08] max-[640px]:text-[27px]">Never get caught off guard by a due date again.</h3>
                                <p className="text-[#6B6375] text-[15px] leading-[1.62]">Your calendar shows everything that you owe in one place: what's paid, what's due soon, and what you missed.</p>
                                <ul className="grid gap-[7px] mt-[23px] p-0 list-none text-[#091828] text-[13px] font-bold">
                                    {["See what's due and when", "Spot bills before they're late", "Mark it paid in a tap"].map((li)=> (
                                        <li key={li} className="flex items-center gap-[9px]">
                                            <span className="grid place-items-center w-[18px] h-[18px] rounded-full bg-[#DCEFE8] text-[10px] shrink-0">✓</span>
                                            {li}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <figure className="justify-self-center max-[640px]:justify-self-start w-[255px] max-[850px]:w-[220px] max-[640px]:w-[220px] m-0">
                                <img
                                    src={calendarImg}
                                    alt="The SpendSense calendar showing monthly payment statuses and payments due on the selected day."
                                    className="block w-full h-[560px] object-cover object-top border-2 border-[#091828] rounded-[20px] shadow-[11px_12px_0_#FFDC8A] max-[640px]:h-[500px]"
                                />
                                <figcaption className="inline-block mt-[13px] px-[9px] py-[5px] rounded-full bg-[#091828] text-white text-[10px] font-extrabold">Money calendar</figcaption>
                            </figure>
                        </article>

                        <article className="grid grid-cols-[285px_1fr] gap-[125px] items-start py-[69px] px-[65px] border-b-[1.5px] border-[#C9DBD3] bg-white max-[850px]:grid-cols-[240px_1fr] max-[850px]:gap-[50px] max-[850px]:py-[55px] max-[850px]:px-[30px] max-[640px]:grid-cols-1 max-[640px]:gap-[31px] max-[640px]:py-[47px] max-[640px]:px-0">
                            <figure className="justify-self-center max-[640px]:justify-self-start w-[255px] max-[850px]:w-[220px] max-[640px]:w-[220px] m-0">
                                <img
                                    src={questsImg}
                                    alt="The SpendSense quests screen showing daily and weekly financial tasks, streak progress and rewards."
                                    className="block w-full h-[560px] object-cover object-top border-2 border-[#091828] rounded-[20px] shadow-[11px_12px_0_#FF6B9D] max-[640px]:h-[500px]"
                                />
                                <figcaption className="inline-block mt-[13px] px-[9px] py-[5px] rounded-full bg-[#091828] text-white text-[10px] font-extrabold">Quests</figcaption>
                            </figure>
                            <div className="max-w-[495px] pt-16 max-[640px]:pt-0">
                                <span className="inline-block rounded-full text-[11px] font-extrabold tracking-[0.35px] px-[9px] py-[5px] bg-[#FFDC8A]">Build</span>
                                <h3 className="mt-[13px] mb-3 text-[31px] font-black tracking-[-1.35px] leading-[1.08] max-[640px]:text-[27px]">Making good habits feel like less of a chore.</h3>
                                <p className="text-[#6B6375] text-[15px] leading-[1.62]">Quests push you toward the things you keep meaning to do. Streaks, XP, and stickers make the progress feel real.</p>
                                <ul className="grid gap-[7px] mt-[23px] p-0 list-none text-[#091828] text-[13px] font-bold">
                                    {["Complete daily and weekly quests", "Keep the streak alive", "Earn rewards as you go"].map((li)=> (
                                        <li key={li} className="flex items-center gap-[9px]">
                                            <span className="grid place-items-center w-[18px] h-[18px] rounded-full bg-[#DCEFE8] text-[10px] shrink-0">✓</span>
                                            {li}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </article>

                        <article className="grid grid-cols-[1fr_285px] gap-[125px] items-start py-[69px] px-[65px] max-[850px]:grid-cols-[1fr_240px] max-[850px]:gap-[50px] max-[850px]:py-[55px] max-[850px]:px-[30px] max-[640px]:grid-cols-1 max-[640px]:gap-[31px] max-[640px]:py-[47px] max-[640px]:px-0">
                            <div className="max-w-[495px] pt-16 max-[640px]:pt-0">
                                <span className="inline-block rounded-full text-[11px] font-extrabold tracking-[0.35px] px-[9px] py-[5px] bg-[#FFD8E6] text-[#AC2A5D]">Understand</span>
                                <h3 className="mt-[13px] mb-3 text-[31px] font-black tracking-[-1.35px] leading-[1.08] max-[640px]:text-[27px]">Turn your spending history into your next smart move.</h3>
                                <p className="text-[#6B6375] text-[15px] leading-[1.62]">Insights flag what's actually worth noticing, so that you can properly plan ahead.</p>
                                <ul className="grid gap-[7px] mt-[23px] p-0 list-none text-[#091828] text-[13px] font-bold">
                                    {["See where your money went", "Catch changes before they become a pattern", "See your pending payments"].map((li)=> (
                                        <li key={li} className="flex items-center gap-[9px]">
                                            <span className="grid place-items-center w-[18px] h-[18px] rounded-full bg-[#DCEFE8] text-[10px] shrink-0">✓</span>
                                            {li}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <figure className="justify-self-center max-[640px]:justify-self-start w-[255px] max-[850px]:w-[220px] max-[640px]:w-[220px] m-0">
                                <img
                                    src={insightsImg}
                                    alt="The SpendSense insights screen showing spending prompts, categories and a spending chart."
                                    className="block w-full h-[560px] object-cover object-top border-2 border-[#091828] rounded-[20px] shadow-[11px_12px_0_#FFDC8A] max-[640px]:h-[500px]"
                                />
                                <figcaption className="inline-block mt-[13px] px-[9px] py-[5px] rounded-full bg-[#091828] text-white text-[10px] font-extrabold">Insights</figcaption>
                            </figure>
                        </article>
                    </div>
                </section>

                <section className="py-[104px] bg-[#091828] text-white max-[640px]:py-[70px]">
                    <div className={`${container} grid grid-cols-2 gap-[110px] max-[850px]:grid-cols-1 max-[850px]:gap-[25px]`}>
                        <div>
                            <h2 className="max-w-[470px] text-white text-[clamp(39px,4.7vw,63px)] font-black tracking-[-2.3px] leading-[1.02] max-[850px]:max-w-[650px] max-[640px]:tracking-[-1.9px]">
                                Less stress around money. More time for what matters.
                            </h2>
                        </div>
                        <div>
                            <p className="mb-[15px] text-[#C1CED2] text-[17px] leading-[1.65] max-[640px]:text-[15px]">
                                You don't need to be a finance person to use SpendSense. It helps you keep track of what matters, one step at a time.
                            </p>
                            <p className="mb-0 text-[#C1CED2] text-[17px] leading-[1.65] max-[640px]:text-[15px]">
                                The idea is simple: make the decision today a bit easier so that tomorrow feels more sorted.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="py-[100px] bg-[#FFDC8A] text-center max-[640px]:py-[70px]" id="start">
                    <div className={`${container} max-w-[740px]`}>
                        <span className="grid place-items-center w-12 h-12 mx-auto mb-[18px] border-2 border-[#091828] rounded-full bg-[#FF6B9D] shadow-[3px_4px_0_#091828] text-[28px] font-bold">+</span>
                        <h2 className="mb-[18px] text-[clamp(37px,4.5vw,61px)] font-black tracking-[-2.3px] leading-[1.02] max-[640px]:tracking-[-1.9px]">Start with your next payment.</h2>
                        <p className="max-w-[470px] mx-auto mb-[27px] text-[#554F5D] text-base">Add the next thing you owe, and let SpendSense keep an eye on it for you.</p>
                        <Link className={`${button} bg-[#091828] text-white shadow-[4px_5px_0_#FF6B9D]`} to="/register">
                            Get started <span>→</span>
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="py-[26px] bg-white">
                <div className={`${container} flex items-center justify-between gap-5 max-[640px]:flex-wrap`}>
                    <img src={logo} alt="SpendSense" className="w-[146px] h-auto" />
                    <p className="text-[#6B6375] text-xs m-0 max-[640px]:order-3 max-[640px]:w-full">Built by students, for students struggling with money.</p>
                    <a className="text-[#6B6375] text-xs font-extrabold" href="#top">Back to top ↑</a>
                </div>
            </footer>
        </div>
    )
}
