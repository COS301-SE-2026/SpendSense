
import type {AllocationOption,SimulationDetail} from "../types"

const allocationOptions:AllocationOption[]=[
    {
        id:'current_80_savings_20',
        label:'80 / 20',
        currentAmount:'4800.00',
        savingsAmount:'1200.00'
    },{
        id:'current_70_savings_30',
        label:'70 / 30',
        currentAmount:'4200.00',
        savingsAmount:'1800.00'
    },{
        id:'current_60_savings_40',
        label:'60 / 40',
        currentAmount:'3600.00',
        savingsAmount:'2400.00'
    }
]

export const activeBoardFixture:SimulationDetail={
    session:{
        id:'sim_fixture_1',
        status:'ACTIVE',
        timedMode:true,
        currentDay:8,
        daysInMonth:30,
        nextDayAt:'2026-09-21T12:00:15.000Z',
        startingBudget:'6000.00',
        currentBalance:'3400.00',
        savingsBalance:'1800.00',
        score:'50.00',
        pending:{
            type:'NONE',
            id:null
        },
        createdAt:'2026-09-21T11:58:00.000Z',
        updatedAt:'2026-09-21T12:00:00.000Z',
        completedAt:null
    },
    allocation:{
        options:allocationOptions,
        custom:{
            enabled:true,
            minCurrentAmount:'0.00',
            maxCurrentAmount:'6000.00',
            increment:'50.00'
        },
        selected:allocationOptions[1]
    },
    obligations:[
        {
            id:'ob_fixture_1',
            templateCode:'TRANSPORT_MONTHLY',
            name:'Transport',
            category:'Transport',
            amountDue:'800.00',
            dueDay:5,
            status:'PAID',
            paidAt:'2026-09-21T11:59:00.000Z',
            currentUsed:'800.00',
            savingsUsed:'0.00',
            pointsAwarded:'50.00'
        },{
            id:'ob_fixture_2',
            templateCode:'UTILITIES_MONTHLY',
            name:'Utilities',
            category:'Utilities',
            amountDue:'600.00',
            dueDay:14,
            status:'SCHEDULED',
            paidAt:null,
            currentUsed:'0.00',
            savingsUsed:'0.00',
            pointsAwarded:'0.00'
        }
    ],
    currentEvent:null,
    recentScoreEntries:[
        {
            id:'score_fixture_1',
            sourceType:'OBLIGATION_PAYMENT',
            sourceId:'ob_fixture_1',
            simulatedDay:5,
            pointsDelta:'50.00',
            reason:'On-time obligation payment',
            createdAt:'2026-09-21T11:59:00.000Z'
        }
    ],
    completion:null,
    allowedActions:[]
}

export const paymentResultFixture:SimulationDetail={
    ...activeBoardFixture,
    session:{
        ...activeBoardFixture.session,
        currentDay:14,
        nextDayAt:null,
        currentBalance:'2800.00',
        score:'100.00',
        pending:{
            type:'PAYMENT_RESULT',
            id:'ob_fixture_2'
        }
    },
    obligations:[
        activeBoardFixture.obligations[0],
        {
            ...activeBoardFixture.obligations[1],
            status:'PAID',
            paidAt:'2026-09-21T12:01:00.000Z',
            currentUsed:'600.00',
            savingsUsed:'0.00',
            pointsAwarded:'50.00'
        }
    ],
    recentScoreEntries:[
        {
            id:'score_fixture_2',
            sourceType:'OBLIGATION_PAYMENT',
            sourceId:'ob_fixture_2',
            simulatedDay:14,
            pointsDelta:'50.00',
            reason:'On-time obligation payment',
            createdAt:'2026-09-21T12:01:00.000Z'
        },
        ...activeBoardFixture.recentScoreEntries
    ],
    allowedActions:['CONTINUE']
}

export const eventRevealFixture:SimulationDetail={
    ...activeBoardFixture,
    session:{
        ...activeBoardFixture.session,
        currentDay:12,
        nextDayAt:null,
        pending:{
            type:'EVENT_REVEAL',
            id:'event_fixture_1'
        }
    },
    currentEvent:{
        id:'event_fixture_1',
        triggerDay:12,
        title:'Unexpected repair',
        context:'An essential household item needs an urgent repair.',
        options:[
            {
                id:'pay_now',
                label:'Pay for the repair now',
                immediateCost:'600.00',
                feeOrDebt:'0.00'
            },{
                id:'delay_repair',
                label:'Delay the repair',
                immediateCost:'0.00',
                feeOrDebt:'100.00'
            },{
                id:'borrow',
                label:'Borrow to cover the repair',
                immediateCost:'0.00',
                feeOrDebt:'650.00'
            }
        ],
        decisionExpiresAt:'2026-09-21T12:02:30.000Z'
    },
    allowedActions:['RESOLVE_EVENT']
}

export const eventResultFixture:SimulationDetail={
    ...activeBoardFixture,
    session:{
        ...activeBoardFixture.session,
        currentDay:12,
        nextDayAt:null,
        currentBalance:'2800.00',
        score:'80.00',
        pending:{
            type:'EVENT_RESULT',
            id:'event_fixture_1'
        }
    },
    currentEvent:null,
    recentScoreEntries:[
        {
            id:'score_fixture_3',
            sourceType:'EVENT_DECISION',
            sourceId:'event_fixture_1',
            simulatedDay:12,
            pointsDelta:'30.00',
            reason:'Unexpected repair decision',
            createdAt:'2026-09-21T12:02:00.000Z'
        },
        ...activeBoardFixture.recentScoreEntries
    ],
    allowedActions:['CONTINUE']
}

export const pausedFixture:SimulationDetail={
    ...activeBoardFixture,
    session:{
        ...activeBoardFixture.session,
        status:'PAUSED',
        nextDayAt:null,
        pending:{
            type:'NONE',
            id:null
        }
    },
    allowedActions:[]
}

export const completedFixture:SimulationDetail={
    ...activeBoardFixture,
    session:{
        ...activeBoardFixture.session,
        status:'COMPLETED',
        currentDay:30,
        nextDayAt:null,
        currentBalance:'1200.00',
        savingsBalance:'1600.00',
        score:'190.00',
        completedAt:'2026-09-21T12:10:00.000Z',
        pending:{
            type:'SUMMARY',
            id:null
        }
    },
    currentEvent:null,
    completion:{
        version:'v1',
        completedAt:'2026-09-21T12:10:00.000Z',
        currentBalance:'1200.00',
        savingsBalance:'1600.00',
        totalRemaining:'2800.00',
        weightedRemaining:'3120.00',
        remainingPercentage:'46.67',
        savingsRetentionMultiplier:'1.20',
        budgetBonus:'40.00',
        finalScore:'190.00',
        obligations:{
            paidOnTime:2,
            paidLate:0,
            missed:0
        },
        events:{
            resolved:1,
            expired:0
        }
    },
    allowedActions:[]
}

export const briefingFixture:SimulationDetail={
    ...activeBoardFixture,
    session:{
        ...activeBoardFixture.session,
        status:'BRIEFING',
        currentDay:0,
        nextDayAt:null,
        currentBalance:'0.00',
        savingsBalance:'0.00',
        score:'0.00',
        pending:{
            type:'NONE',
            id:null
        }
    },
    allocation:{
        ...activeBoardFixture.allocation,
        selected:null
    },
    obligations:activeBoardFixture.obligations.map(obligation=>({
        ...obligation,
        status:'SCHEDULED',
        paidAt:null,
        currentUsed:'0.00',
        savingsUsed:'0.00',
        pointsAwarded:'0.00'
    })),
    recentScoreEntries:[],
    allowedActions:['SETUP']
}