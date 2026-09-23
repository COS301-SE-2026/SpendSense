import {isFalse,isTrue,numberAbove,numberEquals,stringEquals,stringIn} from './guidanceFacts'
import type {GuideCandidate,GuideFacts} from './guidanceTypes'

export const GUIDANCE_ROUTES={
    dashboard:'/domains/dashboard',
    calendar:'/calendar',
    scheduledPayments:'/calendar/scheduled',
    addObligation:'/obligationForm',
    quiz:'/quiz',
    insights:'/insights',
    mascotHome:'/mascot',
    help:'/help',
} as const

const RETRY={label:'Retry',intent:'retry'} as const

function paymentsHaveRun(facts:GuideFacts):boolean{
    return numberAbove(facts,'contributionCount',0)
}

export const GUIDANCE_CATALOGUE:readonly GuideCandidate[]=[
    {
        id:'dashboard.daily.unavailable',
        surface:'dashboard',
        kind:'result',
        priority:100,
        dismissible:false,
        text:'I could not refresh today\u2019s summary. Your saved payments have not been changed.',
        actions:[RETRY],
        eligible:(facts)=>isTrue(facts,'factsUnavailable'),
    },
    {
        id:'dashboard.daily.nothing-recorded',
        surface:'dashboard',
        kind:'ordinary',
        priority:60,
        dismissible:true,
        text:'Nothing has been recorded today yet. Want to check what is due, or build your quiz streak?',
        actions:[
            {label:'Open calendar',to:GUIDANCE_ROUTES.calendar},
            {label:'Start quiz',to:GUIDANCE_ROUTES.quiz},
        ],
        eligible:(facts)=>numberEquals(facts,'contributionCount',0)&&stringEquals(facts,'dailyQuizStatus','AVAILABLE'),
    },
    {
        id:'dashboard.daily.recorded-quiz-complete',
        surface:'dashboard',
        kind:'ordinary',
        priority:58,
        dismissible:true,
        text:'Nice work. You recorded {amount} today and completed your daily quiz.',
        placeholders:['amount'],
        actions:[{label:'View progress',to:GUIDANCE_ROUTES.mascotHome}],
        eligible:(facts)=>paymentsHaveRun(facts)&&stringEquals(facts,'dailyQuizStatus','COMPLETED'),
    },
    {
        id:'dashboard.daily.recorded-quiz-waiting',
        surface:'dashboard',
        kind:'ordinary',
        priority:55,
        dismissible:true,
        text:'You have recorded {amount} today. Your daily quiz is still waiting when you are ready.',
        placeholders:['amount'],
        actions:[{label:'Go to quiz',to:GUIDANCE_ROUTES.quiz}],
        eligible:(facts)=>paymentsHaveRun(facts)&&stringIn(facts,'dailyQuizStatus',['AVAILABLE','IN_PROGRESS']),
    },
    {
        id:'dashboard.daily.up-to-date',
        surface:'dashboard',
        kind:'ordinary',
        priority:50,
        dismissible:true,
        text:'You are up to date for now. You can review your insights or visit your mascot home.',
        actions:[
            {label:'Open insights',to:GUIDANCE_ROUTES.insights},
            {label:'Mascot home',to:GUIDANCE_ROUTES.mascotHome},
        ],
        eligible:(facts)=>numberEquals(facts,'payableCount',0)&&stringEquals(facts,'dailyQuizStatus','COMPLETED'),
    },

    {
        id:'calendar.empty.no-obligations',
        surface:'calendar',
        kind:'ordinary',
        priority:50,
        dismissible:true,
        text:'There are no scheduled payments yet. Add an obligation when you are ready and I will help you track it.',
        actions:[{label:'Add an obligation',to:GUIDANCE_ROUTES.addObligation}],
        eligible:(facts)=>numberEquals(facts,'obligationCount',0),
    },
    {
        id:'calendar.overdue.explainer',
        surface:'calendar',
        kind:'urgent',
        priority:75,
        dismissible:true,
        text:'This payment is overdue. Recording it now keeps your history accurate, though it may be marked late.',
        actions:[{label:'Open scheduled payments',to:GUIDANCE_ROUTES.scheduledPayments}],
        eligible:(facts)=>isTrue(facts,'isOverdue'),
    },
    {
        id:'calendar.occurrence.partial-balance',
        surface:'calendar',
        kind:'urgent',
        priority:70,
        dismissible:true,
        text:'You have already recorded {amountPaid}. {amountRemaining} is still outstanding.',
        placeholders:['amountPaid','amountRemaining'],
        actions:[{label:'Open scheduled payments',to:GUIDANCE_ROUTES.scheduledPayments}],
        eligible:(facts)=>numberAbove(facts,'paidMinorUnits',0)&&numberAbove(facts,'remainingMinorUnits',0),
    },
    {
        id:'calendar.occurrence.payable',
        surface:'calendar',
        kind:'ordinary',
        priority:55,
        dismissible:true,
        text:'This payment is due on {dueDate}. Check the amount and status before recording it.',
        placeholders:['dueDate'],
        eligible:(facts)=>isTrue(facts,'isPayable')&&!isTrue(facts,'isOverdue')&&numberEquals(facts,'paidMinorUnits',0),
    },

    {
        id:'payment.result.failed',
        surface:'payment',
        kind:'result',
        priority:96,
        dismissible:false,
        text:'That payment was not recorded. Refresh the balance and review the details before trying again.',
        actions:[RETRY],
        eligible:(facts)=>stringEquals(facts,'paymentResult','FAILED'),
    },
    {
        id:'payment.result.partial',
        surface:'payment',
        kind:'result',
        priority:92,
        dismissible:true,
        text:'Good progress: {amountRecorded} recorded and {amountRemaining} remains.',
        placeholders:['amountRecorded','amountRemaining'],
        eligible:(facts)=>stringEquals(facts,'paymentResult','PARTIAL'),
    },
    {
        id:'payment.result.final-on-time',
        surface:'payment',
        kind:'result',
        priority:92,
        dismissible:true,
        text:'Payment completed on time. Your recorded progress, score and rewards have been updated.',
        eligible:(facts)=>stringEquals(facts,'paymentResult','FINAL_ON_TIME'),
    },
    {
        id:'payment.result.final-late',
        surface:'payment',
        kind:'result',
        priority:92,
        dismissible:true,
        text:'Payment completed, but it was recorded late. Your history has been updated.',
        eligible:(facts)=>stringEquals(facts,'paymentResult','FINAL_LATE'),
    },
    {
        id:'payment.receipt.review',
        surface:'payment',
        kind:'urgent',
        priority:80,
        dismissible:true,
        text:'I found possible receipt details. Please review the amount and choose the correct payment occurrence before confirming.',
        eligible:(facts)=>isTrue(facts,'hasReceiptCandidate'),
    },

    {
        id:'quiz.request.failed',
        surface:'quiz',
        kind:'result',
        priority:96,
        dismissible:false,
        text:'Your quiz progress could not be refreshed. Your answer has not been changed by this message.',
        actions:[RETRY],
        eligible:(facts)=>isTrue(facts,'quizRequestFailed'),
    },
    {
        id:'quiz.session.completed',
        surface:'quiz',
        kind:'result',
        priority:94,
        dismissible:true,
        text:'You completed today\u2019s quiz and earned {coinsAwarded} coins and {xpAwarded} XP.',
        placeholders:['coinsAwarded','xpAwarded'],
        actions:[{label:'View progress',to:GUIDANCE_ROUTES.mascotHome}],
        eligible:(facts)=>isTrue(facts,'dailyQuizJustCompleted'),
    },
    {
        id:'quiz.topic.completed',
        surface:'quiz',
        kind:'result',
        priority:93,
        dismissible:true,
        text:'That topic quiz is done, and you earned {coinsAwarded} coins and {xpAwarded} XP. It does not count as today\u2019s daily quiz.',
        placeholders:['coinsAwarded','xpAwarded'],
        actions:[{label:'Daily quiz',to:GUIDANCE_ROUTES.quiz}],
        eligible:(facts)=>isTrue(facts,'topicQuizJustCompleted'),
    },
    {
        id:'quiz.feedback.correct',
        surface:'quiz',
        kind:'result',
        priority:90,
        dismissible:false,
        text:'Great thinking, that is right. {explanation}',
        placeholders:['explanation'],
        eligible:(facts)=>isTrue(facts,'answerSubmitted')&&isTrue(facts,'answerCorrect'),
    },
    {
        id:'quiz.feedback.incorrect',
        surface:'quiz',
        kind:'result',
        priority:90,
        dismissible:false,
        text:'Not quite, and that is a normal part of learning. Here is the key idea: {explanation}',
        placeholders:['explanation'],
        actions:[{label:'Next question',intent:'continue'}],
        eligible:(facts)=>isTrue(facts,'answerSubmitted')
            &&isFalse(facts,'answerCorrect')
            &&!isTrue(facts,'answerRequeued'),
    },
    {
        id:'quiz.feedback.incorrect-requeued',
        surface:'quiz',
        kind:'result',
        priority:91,
        dismissible:false,
        text:'Not quite. This one comes back later in the quiz, so hold on to this: {explanation}',
        placeholders:['explanation'],
        actions:[{label:'Next question',intent:'continue'}],
        eligible:(facts)=>isTrue(facts,'answerSubmitted')
            &&isFalse(facts,'answerCorrect')
            &&isTrue(facts,'answerRequeued'),
    },
    {
        id:'quiz.daily.in-progress',
        surface:'quiz',
        kind:'ordinary',
        priority:60,
        dismissible:true,
        text:'You have an unfinished daily quiz. Continue where you left off when you are ready.',
        actions:[{label:'Resume quiz',to:GUIDANCE_ROUTES.quiz}],
        eligible:(facts)=>stringEquals(facts,'dailyQuizStatus','IN_PROGRESS'),
    },
    {
        id:'quiz.daily.available',
        surface:'quiz',
        kind:'ordinary',
        priority:50,
        dismissible:true,
        text:'A short daily quiz is ready. You can start now or come back later.',
        actions:[{label:'Start quiz',to:GUIDANCE_ROUTES.quiz}],
        eligible:(facts)=>stringEquals(facts,'dailyQuizStatus','AVAILABLE'),
    },

     {
        id:'insights.request.failed',
        surface:'insights',
        kind:'result',
        priority:95,
        dismissible:false,
        text:'Insights could not refresh. Your records are unchanged.',
        actions:[RETRY],
        eligible:(facts)=>isTrue(facts,'insightsFailed'),
    },
    {
        id:'insights.upcoming-pressure.elevated',
        surface:'insights',
        kind:'urgent',
        priority:70,
        dismissible:true,
        text:'Several recorded payments are coming up soon. Open the calendar to see their dates and amounts.',
        actions:[{label:'Open calendar',to:GUIDANCE_ROUTES.calendar}],
        eligible:(facts)=>stringEquals(facts,'insightKey','upcoming-pressure')&&stringIn(facts,'insightSeverity',['warning','critical']),
    },
    {
        id:'insights.obligation-trend.increase',
        surface:'insights',
        kind:'urgent',
        priority:65,
        dismissible:true,
        text:'Your recorded obligations are higher than the previous period. Review the calendar to see what changed.',
        actions:[{label:'Open calendar',to:GUIDANCE_ROUTES.calendar}],
        eligible:(facts)=>stringEquals(facts,'insightKey','obligation-trend')&&stringEquals(facts,'insightDirection','increase'),
    },
    {
        id:'insights.on-time-rate.value',
        surface:'insights',
        kind:'ordinary',
        priority:56,
        dismissible:true,
        text:'Your on-time rate is {insightValue}. This reflects recorded completed and missed payment occurrences, not a real credit-bureau score.',
        placeholders:['insightValue'],
        actions:[{label:'Open calendar',to:GUIDANCE_ROUTES.calendar}],
        eligible:(facts)=>stringEquals(facts,'insightKey','on-time-rate')&&isTrue(facts,'hasEnoughHistory'),
    },
    {
        id:'insights.on-time-rate.insufficient',
        surface:'insights',
        kind:'ordinary',
        priority:55,
        dismissible:true,
        text:'There is not enough completed payment history for a reliable rate yet. Recording payments will build this view.',
        actions:[{label:'Open calendar',to:GUIDANCE_ROUTES.calendar}],
        eligible:(facts)=>stringEquals(facts,'insightKey','on-time-rate')&&isFalse(facts,'hasEnoughHistory'),
    },
    {
        id:'insights.payment-streak.positive',
        surface:'insights',
        kind:'ordinary',
        priority:52,
        dismissible:true,
        text:'Your current on-time streak is {streak}. Consistent recorded on-time completion builds it.',
        placeholders:['streak'],
        actions:[{label:'Mascot home',to:GUIDANCE_ROUTES.mascotHome}],
        eligible:(facts)=>stringEquals(facts,'insightKey','payment-streak')&&numberAbove(facts,'streak',0),
    },
    {
        id:'insights.upcoming-pressure.steady',
        surface:'insights',
        kind:'ordinary',
        priority:50,
        dismissible:true,
        text:'Your upcoming recorded payments look manageable right now. Keep checking the calendar as dates approach.',
        actions:[{label:'Open calendar',to:GUIDANCE_ROUTES.calendar}],
        eligible:(facts)=>stringEquals(facts,'insightKey','upcoming-pressure')&&stringIn(facts,'insightSeverity',['positive','info']),
    },
    {
        id:'insights.category-breakdown',
        surface:'insights',
        kind:'ordinary',
        priority:45,
        dismissible:true,
        text:'This shows how your recorded obligations are distributed by category. It is a planning view, not a full expense ledger.',
        eligible:(facts)=>stringEquals(facts,'insightKey','category-breakdown'),
    },
    {
        id:'insights.empty',
        surface:'insights',
        kind:'ordinary',
        priority:40,
        dismissible:true,
        text:'There is not enough insight data yet. Recording obligations and payments will fill this in.',
        actions:[{label:'Open calendar',to:GUIDANCE_ROUTES.calendar}],
        eligible:(facts)=>isTrue(facts,'insightsEmpty'),
    },
]

export const GUIDANCE_TIP_ID_ALLOWLIST:readonly string[]=
    GUIDANCE_CATALOGUE.filter((card)=>card.dismissible).map((card)=>card.id)

export function isAllowlistedTipId(id:string):boolean{
    return GUIDANCE_TIP_ID_ALLOWLIST.includes(id)
}

export interface WalkthroughStop{
    title:string
    body:string
    target?:string
}

export interface WalkthroughStepCopy{
    screen:string
    route:string
    stops:readonly WalkthroughStop[]
}

export const WALKTHROUGH_STEPS:readonly WalkthroughStepCopy[]=[
    {
        screen:'Dashboard',
        route:GUIDANCE_ROUTES.dashboard,
        stops:[
            {
                title:'Your home base',
                body:'This is your home base. I will help you spot what needs attention first.',
            },
            {
                title:'Your simulated score',
                body:'This gauge is a practice credit score built from the payments you record here. It is a learning tool, not a real credit-bureau score.',
                target:'dashboard.score',
            },
            {
                title:'Level and XP',
                body:'Recording payments and finishing quizzes earns XP, which fills this bar and raises your level. Coins from rewards are what you spend on mascot cosmetics.',
                target:'dashboard.xp',
            },
            {
                title:'What is coming up',
                body:'Your next scheduled payments sit here, soonest first, so you can see what is due before it slips past.',
                target:'dashboard.upcoming',
            },
            {
                title:'Me, in the corner',
                body:'I stay down here with a short note about today. Tap me to send me off screen, and tap the tab on the edge to bring me back.',
                target:'dashboard.mascot',
            },
        ],
    },
    {
        screen:'Calendar',
        route:GUIDANCE_ROUTES.calendar,
        stops:[
            {
                title:'Your month at a glance',
                body:'Each obligation creates scheduled payment occurrences. Dates and statuses show what still needs attention.',
            },
            {
                title:'The month grid',
                body:'Days with a scheduled payment are marked. Tap a day to narrow everything below it to that date, and tap it again to go back to the whole month.',
                target:'calendar.grid',
            },
            {
                title:'The day panel',
                body:'This panel follows your selection: it names the day you are looking at and lists what falls on it.',
                target:'calendar.day',
            },
            {
                title:'The full list',
                body:'This opens every scheduled occurrence in one list, grouped by month, which is usually the fastest way to find something specific.',
                target:'calendar.all',
            },
        ],
    },
    {
        screen:'Scheduled payments',
        route:GUIDANCE_ROUTES.scheduledPayments,
        stops:[
            {
                title:'Recording a payment',
                body:'You can record a full payment or make progress with a partial payment. Always check the remaining balance before confirming.',
            },
            {
                title:'Grouped by month',
                body:'Occurrences are grouped by month and the current month opens first, so what is due soonest is already in front of you.',
                target:'scheduled.month',
            },
            {
                title:'One occurrence',
                body:'Each row shows the amount, the due date and the status. Tap one to open the payment form with that occurrence already selected.',
                target:'scheduled.occurrence',
            },
        ],
    },
    {
        screen:'Daily quiz',
        route:GUIDANCE_ROUTES.quiz,
        stops:[
            {
                title:'A quiz a day',
                body:'Daily quizzes build financial knowledge. You can resume an unfinished one whenever you are ready.',
            },
            {
                title:'What you are about to do',
                body:'Before you start, this tells you how many questions there are and what finishing is worth in XP and coins.',
                target:'quiz.summary',
            },
            {
                title:'Start or resume',
                body:'Leaving halfway is fine. Your answers are kept, and this button picks up from the question you stopped on.',
                target:'quiz.start',
            },
        ],
    },
    {
        screen:'Insights',
        route:GUIDANCE_ROUTES.insights,
        stops:[
            {
                title:'Reading your patterns',
                body:'Insights explain your recorded patterns; coins, XP and streaks reflect actions you have actually completed.',
            },
            {
                title:'Monthly Wrapped',
                body:'A replay of your month: payments, score progress, streaks and badges collected into one summary.',
                target:'insights.wrapped',
            },
            {
                title:'This month\u2019s insights',
                body:'Each card reads one pattern out of what you have recorded, like upcoming pressure or your on-time rate. I will explain whichever one is on screen.',
                target:'insights.list',
            },
        ],
    },
]

export function walkthroughRouteFor(step:number):string{
    const index=Math.min(Math.max(Math.trunc(step),0),WALKTHROUGH_STEPS.length-1)
    return WALKTHROUGH_STEPS[index].route
}

export function walkthroughStopCount(step:number):number{
    const index=Math.min(Math.max(Math.trunc(step),0),WALKTHROUGH_STEPS.length-1)
    return WALKTHROUGH_STEPS[index].stops.length
}