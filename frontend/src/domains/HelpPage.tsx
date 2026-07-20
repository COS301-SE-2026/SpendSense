import * as React from "react"
import {
	Home,
	Calendar,
	PlusCircle,
	Trophy,
	User,
	BarChart3,
	Gauge,
	ChevronDown,
	Search,
} from "lucide-react"

import {CustomCard} from "@/components/ui/CustomCard"
import {CustomInput} from "@/components/common/CustomInput"
import {SubPageShell} from "@/components/common/SubPageShell"


const walkThrough: {
	icon: React.ReactNode
	tone: "pink"|"mint"|"yellow"|"lilac"
	title: string
	body: string
}[]=[
	{
		icon: <Home className="size-5"/>,
		tone:"mint",
		title: "1. Start on the Dashboard",
		body:"Your home base. This is where you can see your simulated credit score, upcoming payments, recent activity, and navigate to everything else.",
	},

	{
		icon: <PlusCircle className="size-5"/>,
		tone:"pink",
		title: "2. Add your obligations and log payments",
		body:"Use the + button to log payments add financial obligations such as rent, subscriptions, loan repayments etc. Each one gets a payment schedule SpendSense tracks for you.",
	},

	{
		icon: <Calendar className="size-5"/>,
		tone:"lilac",
		title: "3. Log and track payments on the Calendar",
		body:"The Calendar shows when payments are due. Log a payment when you make it, paying on time builds your score and your streak.",
	},

	{
		icon: <Gauge className="size-5"/>,
		tone:"yellow",
		title: "4. Watch your credit score respond",
		body:"Your simulated credit score reacts to your financial behaviour and habits: on-time payments push it up, missed or late payments pull it down.",
	},


	{
		icon: <Trophy className="size-5"/>,
		tone:"pink",
		title: "5. Complete quests and earn rewards",
		body:"Quests give you XP, coins and stickers for good financial habits: daily check-ins, quizzes, streaks and monthly challenges.",
	},


	{
		icon: <BarChart3 className="size-5"/>,
		tone:"mint",
		title: "6. Review your Insights",
		body:"Insights breaks down where your money goes and spots trends: spending changes, payments coming due, and how your streak is going.",
	},


	{
		icon: <User className="size-5"/>,
		tone:"lilac",
		title: "7. Make it yours in Profile",
		body:"Profile is your identity and settings hub: edit your details, tweak preferences and notifications and see your tier, streak and coins.",
	},
]


const faqs: {question: string; answer: string}[]=[
	{
		question: "Is my credit score real?",
		answer:"No, it's a simulation built for learning purposes only. The score responds to your logged beaviour using educational approximations of how credit scoring works. It is not connected to any real bureau and improving it does not change your real-world credit record.",
	},

	{
		question: "Why did my credit score go down?",
		answer:"The most common reasons: a payment was logged late, a payment was missed entirely or a due date passed without a logged payment. Check the calendar for missed obligations and the Dashboard's recent activity for the exact event. Recent events affect the score more than older ones, so getting back on track recovers it over time.",
	},

	{
		question: "What's the difference between an obligation and a payment?",
		answer:"An obligation is an ongoing commitment (e.g. Rent or Subscriptions). A payment is a single instance of paying it. SpendSense generates the schedule of payment occurrences from your obligation and you log payments against those occurrences.",
	},


	{
		question: "What happens if I miss a payment?",
		answer:"The occurrence is marked as missed, your simulated credit score takes a hit and your payment streak resets. It's a safe place to see the consequences, in real life the same behaviour affects your actual credit record for years.",
	},


	{
		question: "what are coins and XP for?",
		answer:"XP levels up your mascot and coins, earned through quests, streaks and challenges, can be used to accessorize your mascot.",
	},

	{
		question: "How do payment streaks work?",
		answer:"Every consecutive on-time payment extends your streak. A late or missed payment resets it. Your current longest streaks show on your Profile.",
	},


	{
		question: "How do I change my name or notification settings?",
		answer:"Profile -> Edit Profile for your display name, and Profile -> Settings for preferences and notification choices.",
	},


	{
		question: "Can I export or delete my data?",
		answer:"Yes, Settings -> Account lets you download everything SpendSense stores about you as a JSON file, and deactivate your account if you want to stop using the app.",
	},

	{
		question: "I found a bug or need more help, who do I contact?",
		answer:"Reach the team through the contact details on the SpendSense GIthub repository (COS301-SE-2026/SpendSense). In-app support is planned for future release.",
	},
]


export default function HelpPage(){
	const[query, setQuery] =React.useState("")
	const[openIndex, setOpenIndex] =React.useState<number |null>(null)

	const trimmedQuery =query.trim().toLowerCase()
	const visibleFaqs = trimmedQuery
		? faqs.filter(
			(f)=>
				f.question.toLowerCase().includes(trimmedQuery) ||
			f.answer.toLowerCase().includes(trimmedQuery)
		)
	:faqs

	return(
		<SubPageShell title= "Help and Support" subtitle="How SpendSense works">
			
			
			{/*walkthrough*/}
			<SectionLabel>Getting Started</SectionLabel>

			{walkThrough.map((step) => (
				<CustomCard key={step.title} variant="navyBorder" size="sm" className="flex items-start gap-3">
					<HelpIcon tone={step.tone}>{step.icon}</HelpIcon>

					<div className="min-w-0 flex-1">
						<p className="text-sm font-bold text-[#091828]">{step.title}</p>
						<p className ="mt-0.5 text-xs text-[#6B6375]">{step.body}</p>
					</div>
				</CustomCard>
			))}



			{/*FAQ*/}

			<SectionLabel className="mt-3">Frequently asked questions</SectionLabel>

			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6B6375]"/>
				<CustomInput 
					value={query}
					onChange={(e)=> setQuery(e.target.value)}
					placeholder="Search questions..."
					aria-label="Search frequently asked questions"
					className="pl-9"
				/>
			</div>

			{visibleFaqs.length === 0 &&(
				<p className="text-sm text-[#6B6375]">
					Seems like no questions match your search. Try different words or browse the full list by clearing the search bar.
				</p>
			)}

			<CustomCard variant="navyBorder" size="sm" className="p-2">
				{visibleFaqs.map((faq)=> {
					const actualIndex =faqs.indexOf(faq)
					const isOpen =openIndex === actualIndex

					return(
						<div key={faq.question} className="border-b border-[#E8E4F4] last:border-b-0">
							<button
								type="button"
								onClick={() => setOpenIndex(isOpen ? null: actualIndex)}
								aria-expanded={isOpen}
								className="flex w-full items-center gap-3 px-3 py-3 text-left">
								
								<span className="flex-1 text-sm font-bold text-[#091828]">{faq.question}</span>
								<ChevronDown className={`size-4 shrink-0 text-[#6B6375] transition-transform ${isOpen ? "rotate-180" : ""}`}/>

							</button>

							{isOpen && (
								<p className="px-3 pb-3 text-xs leading-relaxed text-[#6B6375]">{faq.answer}</p>
							)}

						</div>
					)
				})}
			</CustomCard>

			{/*Score disclaimer*/}
			<CustomCard variant="navyBorder" size="sm" className="bg-[#FFE9B5]">
				<p className ="text-xs leading-relaxed text-[#7A5A00]">
					<span className="font-bold">A note on the credit score:</span> real credit bureau algorithms are proprietary. SpendSense uses educational approximations based on published consumer guidance, great for learning how scoring behaves, but not the exact formulas any bureau runs. 
				</p>
			</CustomCard>
				
			
		</SubPageShell>
	)
}


function SectionLabel({
	children,
	className,
}: Readonly<{
	children: React.ReactNode
	className?: string
}>) {
	return(
		<h2 className={`text-sm font-bold uppercase tracking-wide text-[#6B6375] ${className ?? ""}`}>
			{children}
		</h2>
	)
}


function HelpIcon({
	tone,
	children,
}: Readonly <{
	tone: "mint"|"lilac"|"pink"|"yellow"
	children: React.ReactNode
}>) {
	const toneClass: Record<typeof tone, string> = {
		pink: "bg-[#FFD8E6] text-[#ac2a5d]",
		mint:"bg-[#DCEFE8] text-[#091828]",
		yellow: "bg-[#FFE9B5] text-[#7a5a00]",
		lilac: "bg-[#E8E4F4] text-[#5b4d8b]",
	}

	return(
		<div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneClass[tone]}`}>
			{children}
		</div>
	)
}
