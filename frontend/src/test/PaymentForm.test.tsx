import React from "react";
import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,it,expect,vi,beforeEach} from "vitest";
import "@testing-library/jest-dom";
import PaymentForm from "../domains/PaymentForm";
import {createManualContribution,getUpcomingOccurrences,type ManualContributionResult} from "../features/payments/paymentsApi";
import {getReceiptOccurrenceBalance} from "../features/receipts/receiptOccurrencesApi";
const mockNavigate=vi.fn();
let mockLocationState:unknown=null;
let mockLocationSearch="";

vi.mock("react-router-dom",()=>({
    useNavigate:()=>mockNavigate,
    useLocation:()=>({state:mockLocationState,search:mockLocationSearch}),
}));

vi.mock("../features/payments/paymentsApi",()=>({
    getUpcomingOccurrences:vi.fn(),
    createManualContribution:vi.fn(),
}));
vi.mock("../features/receipts/receiptOccurrencesApi",()=>({
    getReceiptOccurrenceBalance:vi.fn(),
}));

const fullPaymentResponse:ManualContributionResult={
    replayed:false,
    contribution:{
        id:"contribution_123",
        occurrenceId:"occ_netflix",
        obligationId:"obl_netflix",
        amount:"199.00",
        currency:"ZAR",
        paidDate:"2026-09-21T00:00:00.000Z",
        source:"MANUAL",
        state:"POSTED",
        receiptScanId:null,
        notes:"Paid in full",
        createdAt:"2026-09-21T12:00:00.000Z",
    },
    occurrence:{
        id:"occ_netflix",
        obligationId:"obl_netflix",
        obligationName:"Netflix",
        dueDate:"2026-09-25T00:00:00.000Z",
        amountDue:"199.00",
        amountPaid:"199.00",
        amountRemaining:"0.00",
        currency:"ZAR",
        status:"PAID",
        paidAt:"2026-09-21T00:00:00.000Z",
    },
    settlement:{
        isLate:false,
        daysLate:0,
    },
    scoreImpact:{
        scoreEventId:"score_123",
        previousScore:712,
        currentScore:720,
        delta:8,
        tierBefore:"GOOD",
        tierAfter:"GOOD",
        explanation:"On-time payment recorded.",
    },
    rewards:{
        coinsAwarded:15,
        xpAwarded:10,
        coinBalance:100,
        xp:850,
        currentPaymentStreak:5,
        longestPaymentStreak:5,
        mascotMood:"HAPPY",
        badgesEarned:[],
    },
    paymentImpact:{
        isLate:false,
        daysLate:0,
        simulatedInterest:0,
    },
};

const occurrencesResponse={
    data:{
        data:[
            {
                id:"occ_netflix",
                dueDate:"2026-09-25",
                amountDue:199,
                currency:"ZAR",
                status:"PENDING",
                obligation:{id:"obl_netflix",name:"Netflix",type:"SUBSCRIPTION",priority:"MEDIUM"},
            },
            {
                id:"occ_electricity",
                dueDate:"2026-09-30",
                amountDue:300,
                currency:"ZAR",
                status:"OVERDUE",
                obligation:{id:"obl_electricity",name:"Electricity",type:"UTILITY",priority:"HIGH"},
            },
        ],
        meta:{},
    },
};
function balanceFor(id:string){
    const due=id==="occ_electricity"?"300.00":"199.00";
    return{
        occurrence:{
            id,
            obligationId:id==="occ_electricity"?"obl_electricity":"obl_netflix",
            obligationName:id==="occ_electricity"?"Electricity":"Netflix",
            dueDate:"2026-09-30",
            currency:"ZAR",
            amountDue:due,
            amountPaid:"0.00",
            amountRemaining:due,
            status:"PENDING" as const,
            canRecord:true,
        },
    };
}
function partialPaymentResponse():ManualContributionResult{
    return{
        replayed:false,
        contribution:{
            id:"contribution_partial",
            occurrenceId:"occ_electricity",
            obligationId:"obl_electricity",
            amount:"100.00",
            currency:"ZAR",
            paidDate:"2026-09-21T00:00:00.000Z",
            source:"MANUAL",
            state:"POSTED",
            receiptScanId:null,
            notes:null,
            createdAt:"2026-09-21T12:00:00.000Z",
        },
        occurrence:{
            id:"occ_electricity",
            obligationId:"obl_electricity",
            obligationName:"Electricity",
            dueDate:"2026-09-30T00:00:00.000Z",
            amountDue:"300.00",
            amountPaid:"100.00",
            amountRemaining:"200.00",
            currency:"ZAR",
            status:"PARTIALLY_PAID",
            paidAt:null,
        },
        settlement:null,
        scoreImpact:null,
        rewards:null,
        paymentImpact:null,
    };
}
async function selectOccurrence(user:ReturnType<typeof userEvent.setup>,name:string){
    const picker=screen.getByRole("button",{name:"Allocate payment to"});
    await waitFor(()=>expect(picker).not.toBeDisabled());
    await user.click(picker);
    await user.click(await screen.findByRole("button",{name:new RegExp(name,"i")}));
}

describe("PaymentForm (ObligationForm) Component",()=>{
    beforeEach(()=>{
        vi.clearAllMocks();
        mockLocationState=null;
        mockLocationSearch="";
        vi.stubGlobal("crypto",{randomUUID:vi.fn(()=>"123e4567-e89b-42d3-a456-426614174000")});
        vi.mocked(getUpcomingOccurrences).mockResolvedValue(occurrencesResponse);
        vi.mocked(createManualContribution).mockResolvedValue(fullPaymentResponse);
        vi.mocked(getReceiptOccurrenceBalance).mockImplementation(async id=>balanceFor(id));
    });

    it("should render all form fields and the 'Add Payment' header correctly",async()=>{
        render(<PaymentForm/>);
        expect(screen.getByRole("heading",{name:/add payment/i})).toBeInTheDocument();
        expect(await screen.findByRole("button",{name:"Allocate payment to"})).toBeInTheDocument();
        expect(screen.getByLabelText(/amount paid/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/\w+ \d{1,2}, \d{4}/i})).toBeInTheDocument();
        expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/log payment/i})).toBeInTheDocument();
    });

    it("loads the available payment occurrences",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        const picker=screen.getByRole("button",{name:"Allocate payment to"});
        await waitFor(()=>expect(picker).not.toBeDisabled());
        await user.click(picker);
        expect(await screen.findByRole("button",{name:/Netflix/i})).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/Electricity/i})).toBeInTheDocument();
        expect(getUpcomingOccurrences).toHaveBeenCalledWith({
            status:"PENDING,OVERDUE",
            perPage:100,
        });
    });

    it("should navigate back when clicking the cancel button",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await user.click(screen.getByRole("button",{name:/clear form/i}));
        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should display validation errors when required fields are missing",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await waitFor(()=>expect(screen.getByRole("button",{name:"Allocate payment to"})).not.toBeDisabled());
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        await waitFor(()=>{
            expect(screen.getByText("OccurrenceID is required.")).toBeInTheDocument();
            expect(screen.getByText("Amount must be greater than 0")).toBeInTheDocument();
        });
    });

    it("should fail validation if the user enters a negative payment amount",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"-250");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByText("Amount must be greater than 0")).toBeInTheDocument();
    });
    it("submits a full contribution and shows the payment impact modal",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await screen.findByRole("heading",{name:"Netflix"});
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"199.00");
        await user.type(screen.getByLabelText(/notes/i),"Paid in full");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        await waitFor(()=>{
            expect(createManualContribution).toHaveBeenCalledWith(
                {
                    occurrenceId:"occ_netflix",
                    amount:"199.00",
                    currency:"ZAR",
                    paidDate:expect.any(String),
                    notes:"Paid in full",
                },
                "123e4567-e89b-42d3-a456-426614174000",
            );
        });
        expect(screen.getByText("Payment impact")).toBeInTheDocument();
        expect(screen.getByText("Payment completed!")).toBeInTheDocument();
        expect(screen.getByText("+8 points")).toBeInTheDocument();
        expect(screen.getByText("712 -> 720")).toBeInTheDocument();
        expect(screen.getByText("+15")).toBeInTheDocument();
        expect(screen.getByText("+10")).toBeInTheDocument();
        expect(screen.getByText("5 days")).toBeInTheDocument();
        await user.click(screen.getByRole("button",{name:/back to dashboard/i}));
        expect(mockNavigate).toHaveBeenCalledWith("/");
    });
    it("submits a partial contribution",async()=>{
        vi.mocked(createManualContribution).mockResolvedValue(partialPaymentResponse());
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await waitFor(()=>expect(screen.getByLabelText(/amount paid/i)).toHaveValue("300"));
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"100");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        await waitFor(()=>{
            expect(createManualContribution).toHaveBeenCalledWith(
                expect.objectContaining({
                    occurrenceId:"occ_electricity",
                    amount:"100.00",
                    currency:"ZAR",
                }),
                "123e4567-e89b-42d3-a456-426614174000",
            );
        });
        expect(screen.getByText("Partial payment recorded!")).toBeInTheDocument();
        expect(screen.getAllByText("R 100.00").length).toBeGreaterThan(0);
        expect(screen.getAllByText("R 200.00").length).toBeGreaterThan(0);
        expect(screen.getByText("Contribution ID: contribution_partial")).toBeInTheDocument();
        expect(screen.queryByText("+0 points")).not.toBeInTheDocument();
        expect(screen.queryByText("+0")).not.toBeInTheDocument();
    });
    it("shows replay confirmation without claiming a second payment",async()=>{
        vi.mocked(createManualContribution).mockResolvedValue({...fullPaymentResponse,replayed:true});
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByText("Previously recorded payment confirmed. No new contribution was created.")).toBeInTheDocument();
        expect(screen.getByText("Contribution ID: contribution_123")).toBeInTheDocument();
        expect(createManualContribution).toHaveBeenCalledTimes(1);
    });
    it("shows the recorded late settlement from the contribution response",async()=>{
        vi.mocked(createManualContribution).mockResolvedValue({
            ...fullPaymentResponse,
            occurrence:{...fullPaymentResponse.occurrence,status:"PAID_LATE"},
            paymentImpact:{isLate:true,daysLate:2,simulatedInterest:0},
        });
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByText("Payment completed!")).toBeInTheDocument();
        expect(screen.getByText("This payment was 2 days late.")).toBeInTheDocument();
        expect(screen.getAllByText(/PAID LATE/).length).toBeGreaterThan(0);
    });
    it("refreshes the authoritative balance before the first submission",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await waitFor(()=>expect(getReceiptOccurrenceBalance).toHaveBeenCalledTimes(1));
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        await waitFor(()=>expect(createManualContribution).toHaveBeenCalledTimes(1));
        expect(getReceiptOccurrenceBalance).toHaveBeenCalledTimes(2);
    });
    it("stops submission when the balance changed before confirmation",async()=>{
        const user=userEvent.setup();
        vi.mocked(getReceiptOccurrenceBalance)
            .mockResolvedValueOnce(balanceFor("occ_electricity"))
            .mockResolvedValueOnce({
                occurrence:{
                    ...balanceFor("occ_electricity").occurrence,
                    amountPaid:"100.00",
                    amountRemaining:"200.00",
                    status:"PARTIALLY_PAID",
                },
            });
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await waitFor(()=>expect(screen.getByLabelText(/amount paid/i)).toHaveValue("300"));
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByText(/The payment balance has changed\./)).toBeInTheDocument();
        expect(createManualContribution).not.toHaveBeenCalled();
        expect(screen.getByText("R 200.00")).toBeInTheDocument();
    });
    it("reuses the same idempotency key after an uncertain failure",async()=>{
        vi.mocked(createManualContribution)
            .mockRejectedValueOnce(new Error("Network error"))
            .mockResolvedValueOnce({...fullPaymentResponse,replayed:true});
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByRole("alert")).toHaveTextContent("could not confirm whether the payment was recorded");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        await waitFor(()=>expect(createManualContribution).toHaveBeenCalledTimes(2));
        expect(vi.mocked(createManualContribution).mock.calls[0][1]).toBe(
            vi.mocked(createManualContribution).mock.calls[1][1]
        );
        expect(getReceiptOccurrenceBalance).toHaveBeenCalledTimes(2);
    });
    it("does not retry an uncertain request with changed payment details",async()=>{
        vi.mocked(createManualContribution).mockRejectedValueOnce(new Error("Network error"));
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"100");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByRole("alert")).toHaveTextContent("could not confirm whether the payment was recorded");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"150");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Restore the original payment details");
        expect(createManualContribution).toHaveBeenCalledTimes(1);
    });
    it("refreshes the balance after a backend stale balance conflict",async()=>{
        vi.mocked(createManualContribution).mockRejectedValueOnce(new Error("Payment amount exceeds remaining balance of 150.00."));
        vi.mocked(getReceiptOccurrenceBalance).mockImplementation(async id=>{
            if(vi.mocked(createManualContribution).mock.calls.length===0)return balanceFor(id);
            return{
                occurrence:{
                    ...balanceFor(id).occurrence,
                    amountPaid:"150.00",
                    amountRemaining:"150.00",
                    status:"PARTIALLY_PAID" as const,
                },
            };
        });
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"100");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByText(/The payment balance has changed\./)).toBeInTheDocument();
        await waitFor(()=>expect(screen.getAllByText("R 150.00").length).toBeGreaterThan(0));
        expect(createManualContribution).toHaveBeenCalledTimes(1);
    });
    it("blocks another submission after an idempotency conflict",async()=>{
        vi.mocked(createManualContribution).mockRejectedValueOnce({
            statusCode:409,
            error:{
                code:"IDEMPOTENCY_KEY_REUSED",
                message:"Idempotency key has already been used with different payment data.",
            },
        });
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByRole("alert")).toHaveTextContent("could not be safely retried");
        await waitFor(()=>expect(screen.getByRole("button",{name:/log payment/i})).toBeDisabled());
        expect(createManualContribution).toHaveBeenCalledTimes(1);
    });
    it("should use the selected calendar occurrence when available",async()=>{
        const user=userEvent.setup();
        mockLocationState={
            occurrence:{
                id:"occ_from_calendar",
                amountDue:199,
                currency:"ZAR",
                dueDate:"2026-05-25T00:00:00.000Z",
                status:"PENDING",
            },
            obligation:{
                name:"Netflix",
                type:"SUBSCRIPTION",
            },
        };
        render(<PaymentForm/>);
        expect(screen.getByText("Netflix")).toBeInTheDocument();
        expect(screen.queryByRole("button",{name:"Allocate payment to"})).not.toBeInTheDocument();
        await waitFor(()=>expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith("occ_from_calendar"));
        expect(screen.getByLabelText(/amount paid/i)).not.toHaveAttribute("readonly");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        await waitFor(()=>{
            expect(createManualContribution).toHaveBeenCalledWith(
                expect.objectContaining({
                    occurrenceId:"occ_from_calendar",
                    amount:"199.00",
                    currency:"ZAR",
                }),
                expect.any(String),
            );
        });
    });

    it("prefills occurrence ID from a receipt scan manual fallback",async()=>{
        mockLocationSearch="?occurrenceId=occ_netflix";
        render(<PaymentForm/>);
        const picker=screen.getByRole("button",{name:"Allocate payment to"});
        await waitFor(()=>expect(picker).toHaveTextContent("Netflix"));
        expect(picker).toHaveTextContent("R 199.00");
        expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith("occ_netflix");
    });

    it("offers scanning without a selected occurrence",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await user.click(screen.getByRole("button",{name:"Scan receipt instead"}));
        expect(mockNavigate).toHaveBeenCalledWith("/receipts/new");
    });

    it("preserves a selected occurrence when opening receipt scanning",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await user.click(screen.getByRole("button",{name:"Scan receipt instead"}));
        expect(mockNavigate).toHaveBeenCalledWith("/receipts/new?occurrenceId=occ_netflix");
    });

    it("opens receipt scanning for the selected calendar occurrence",async()=>{
        const user=userEvent.setup();
        mockLocationState={
            occurrence:{
                id:"occ_from_calendar",
                amountDue:199,
                currency:"ZAR",
                dueDate:"2026-05-25T00:00:00.000Z",
                status:"PENDING",
            },
            obligation:{name:"Netflix",type:"SUBSCRIPTION"},
        };
        render(<PaymentForm/>);
        await user.click(screen.getByRole("button",{name:"Scan receipt instead"}));
        expect(mockNavigate).toHaveBeenCalledWith("/receipts/new?occurrenceId=occ_from_calendar");
    });
    it("prefills the remaining balance instead of the original amount due",async()=>{
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({
            occurrence:{
                ...balanceFor("occ_electricity").occurrence,
                amountPaid:"100.00",
                amountRemaining:"200.00",
                status:"PARTIALLY_PAID",
            },
        });
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await waitFor(()=>expect(screen.getByLabelText(/amount paid/i)).toHaveValue("200"));
        expect(screen.getByText("R 200.00")).toBeInTheDocument();
    });
    it("allows editing the amount for a calendar-selected occurrence",async()=>{
        mockLocationState={
            occurrence:{
                id:"occ_from_calendar",
                amountDue:300,
                currency:"ZAR",
                dueDate:"2026-09-30",
                status:"PENDING",
            },
            obligation:{name:"Electricity",type:"UTILITY"},
        };
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({
            occurrence:{
                ...balanceFor("occ_from_calendar").occurrence,
                amountDue:"300.00",
                amountRemaining:"200.00",
                amountPaid:"100.00",
                status:"PARTIALLY_PAID",
            },
        });
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await waitFor(()=>expect(screen.getByLabelText(/amount paid/i)).toHaveValue("200"));
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"75.50");
        expect(screen.getByLabelText(/amount paid/i)).toHaveValue("75.50");
        expect(screen.getByText("R 124.50")).toBeInTheDocument();
    });
    it("shows the expected remaining balance for a partial amount",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await waitFor(()=>expect(screen.getByLabelText(/amount paid/i)).toHaveValue("300"));
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"100.00");
        expect(screen.getByText("R 200.00")).toBeInTheDocument();
        expect(screen.getByText("This amount will leave an outstanding balance.")).toBeInTheDocument();
    });
    it("rejects amounts exceeding the remaining balance",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await waitFor(()=>expect(screen.getByLabelText(/amount paid/i)).toHaveValue("300"));
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"350.00");
        expect(screen.getByRole("alert")).toHaveTextContent("Amount cannot exceed the outstanding balance.");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(createManualContribution).not.toHaveBeenCalled();
    });
    it("rejects amounts with more than two decimal places",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"100.123");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByText("Amount cannot have more than two decimal places.")).toBeInTheDocument();
        expect(createManualContribution).not.toHaveBeenCalled();
    });
});