import React from "react";
import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,it,expect,vi,beforeEach} from "vitest";
import "@testing-library/jest-dom";
import PaymentForm from "../domains/PaymentForm";
import {getUpcomingOccurrences,logPayment} from "../features/payments/paymentsApi";
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
    logPayment:vi.fn(),
}));
vi.mock("../features/receipts/receiptOccurrencesApi",()=>({
    getReceiptOccurrenceBalance:vi.fn(),
}));
const paymentResponse={
    data:{
        scoreImpact:{
            previousScore:712,
            currentScore:720,
            delta:8,
            explanation:"On-time payment recorded.",
        },
        rewards:{
            coinsAwarded:15,
            xpAwarded:10,
            currentPaymentStreak:5,
            mascotMood:"HAPPY",
        },
        paymentImpact:{
            isLate:false,
            daysLate:0,
            simulatedInterest:0,
        },
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
        vi.mocked(getUpcomingOccurrences).mockResolvedValue(occurrencesResponse);
        vi.mocked(logPayment).mockResolvedValue(paymentResponse);
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
        await waitFor(()=>{
            expect(screen.getByRole("button",{name:"Allocate payment to"})).not.toBeDisabled();
        });
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
        await waitFor(()=>{
            expect(screen.getByText("Amount must be greater than 0")).toBeInTheDocument();
        });
    });

    it("should log the selected occurrence and show the payment impact modal",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Netflix");
        await screen.findByRole("heading",{name:"Netflix"});
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"199.00");
        await user.type(screen.getByLabelText(/notes/i),"Paid in full");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        await waitFor(()=>{
            expect(logPayment).toHaveBeenCalledWith({
                occurrenceId:"occ_netflix",
                amountPaid:199,
                paidDate:expect.any(String),
                notes:"Paid in full",
            });
        });
        expect(screen.getByText("Payment impact")).toBeInTheDocument();
        expect(screen.getByText("Payment made!")).toBeInTheDocument();
        expect(screen.getByText("+8 points")).toBeInTheDocument();
        expect(screen.getByText("712 -> 720")).toBeInTheDocument();
        expect(screen.getByText("+15")).toBeInTheDocument();
        expect(screen.getByText("+10")).toBeInTheDocument();
        expect(screen.getByText("5 days")).toBeInTheDocument();
        await user.click(screen.getByRole("button",{name:/back to dashboard/i}));
        expect(mockNavigate).toHaveBeenCalledWith("/");
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
            expect(logPayment).toHaveBeenCalledWith(expect.objectContaining({
                occurrenceId:"occ_from_calendar",
                amountPaid:199,
            }));
        });
    });

    it("prefills occurrence ID from a receipt scan manual fallback",async()=>{
        mockLocationSearch="?occurrenceId=occ_netflix";
        render(<PaymentForm/>);
        const picker=screen.getByRole("button",{name:"Allocate payment to"});
        await waitFor(()=>{
            expect(picker).toHaveTextContent("Netflix");
        });
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
        await waitFor(()=>{
            expect(screen.getByLabelText(/amount paid/i)).toHaveValue("200");
        });
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
        await waitFor(()=>{
            expect(screen.getByLabelText(/amount paid/i)).toHaveValue("200");
        });
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
        expect(logPayment).not.toHaveBeenCalled();
    });
    it("rejects amounts with more than two decimal places",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"100.123");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByText("Amount cannot have more than two decimal places.")).toBeInTheDocument();
        expect(logPayment).not.toHaveBeenCalled();
    });
    it("does not send partial contributions to the legacy full-payment endpoint",async()=>{
        const user=userEvent.setup();
        render(<PaymentForm/>);
        await selectOccurrence(user,"Electricity");
        await waitFor(()=>expect(screen.getByLabelText(/amount paid/i)).toHaveValue("300"));
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"100");
        await user.click(screen.getByRole("button",{name:/log payment/i}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Partial payment submission will be enabled");
        expect(logPayment).not.toHaveBeenCalled();
    });
});