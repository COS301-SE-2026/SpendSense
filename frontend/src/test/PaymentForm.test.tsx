import React from "react";
import { render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe,it,expect,vi,beforeEach} from "vitest";
import "@testing-library/jest-dom";

import PaymentForm from "../domains/PaymentForm";
import {logPayment} from "../features/payments/paymentsApi";

const mockNavigate = vi.fn();
let mockLocationState: unknown = null;
vi.mock("react-router-dom",()=>({
  useNavigate:()=>mockNavigate,
  useLocation:()=>({state:mockLocationState}),
}));
vi.mock("../features/payments/paymentsApi",()=>({
  logPayment:vi.fn(),
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

describe("PaymentForm (ObligationForm) Component",()=>{
    beforeEach(()=>{
        vi.clearAllMocks();
        mockLocationState=null;
        vi.mocked(logPayment).mockResolvedValue(paymentResponse);
    });

    //add pament field inputs correctly
    it("should render all form fields and the 'Add Payment' header correctly",()=>{
        render(<PaymentForm />);
        expect(screen.getByRole("heading",{ name: /add payment/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/occurence id/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/amount paid/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{ name: /may 21, 2026/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{ name: /log payment/i })).toBeInTheDocument();
    });

    //redirect ot dashboard "/" on cancel
    it("should redirect home when clicking the cancel button",async ()=>{
        const user = userEvent.setup();
        render(<PaymentForm />);
        await user.click(screen.getByRole("button",{ name :/clear form/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    // validation testing
    it("should display Zod schema validation errors when missing required parameters",async ()=>{
        const user = userEvent.setup();
        render(<PaymentForm />);
        await user.clear(screen.getByLabelText(/occurence id/i));
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.click(screen.getByRole("button",{ name :/log payment/i }));
        await waitFor(()=>{
        expect(screen.getByText("OccurenceID is required.")).toBeInTheDocument();
        expect(screen.getByText("Amount must be greater than 0")).toBeInTheDocument();
        });
    });

    it("should fail validation if the user enters a negative payment amount",async ()=>{
        const user = userEvent.setup();
        render(<PaymentForm />);
        await user.type(screen.getByLabelText(/occurence id/i),"occ_payment_xyz");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"-250");
        await user.click(screen.getByRole("button",{ name :/log payment/i }));
        await waitFor(()=>{
        expect(screen.getByText("Amount must be greater than 0")).toBeInTheDocument();
        });
    });

    //popup testing
    it("should log form values correctly and show the payment impact modal on success",async ()=>{
        const user = userEvent.setup();
        render(<PaymentForm />);
        await user.type(screen.getByLabelText(/occurence id/i),"occ_12345");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"750.00");
        await user.type(screen.getByLabelText(/notes/i),"Paid in full");
        await user.click(screen.getByRole("button",{ name :/log payment/i }));
        await waitFor(()=>{
            expect(logPayment).toHaveBeenCalledWith({
                occurrenceId:"occ_12345",
                amountPaid:750,
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

        await user.click(screen.getByRole("button",{ name:/back to dashboard/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/");
        });

    it("should use the selected calendar occurrence when available",async ()=>{
        const user = userEvent.setup();
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

        render(<PaymentForm />);

        expect(screen.getByText("Netflix")).toBeInTheDocument();
        expect(screen.queryByLabelText(/occurence id/i)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/amount paid/i)).toHaveValue("199");

        await user.click(screen.getByRole("button",{ name :/log payment/i }));

        await waitFor(()=>{
            expect(logPayment).toHaveBeenCalledWith(expect.objectContaining({
                occurrenceId:"occ_from_calendar",
                amountPaid:199,
            }));
        });
    });
});
