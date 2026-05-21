import React from "react";
import { render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe,it,expect,vi,beforeEach} from "vitest";
import "@testing-library/jest-dom";

import PaymentForm from "../domains/PaymentForm";

const mockNavigate = vi.fn();
vi.mock("react-router-dom",()=>({
  useNavigate:()=>mockNavigate,
}));

describe("PaymentForm (ObligationForm) Component",()=>{
    beforeEach(()=>{
        vi.clearAllMocks();
    });

    //add pament field inputs correctly
    it("should render all form fields and the 'Add Payment' header correctly",()=>{
        render(<PaymentForm />);
        expect(screen.getByRole("heading",{ name: /add payment/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/occurence id/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/amount paid/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{ name: /\w+ \d{1,2}, \d{4}/i })).toBeInTheDocument()
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
    it("should log form values correctly and pop up the gamification alert on success",async ()=>{
        vi.useFakeTimers({ shouldAdvanceTime:true });
        const user = userEvent.setup({ advanceTimers:vi.advanceTimersByTime.bind(vi) });
        const consoleSpy = vi.spyOn(console,"log");
        render(<PaymentForm />);
        await user.type(screen.getByLabelText(/occurence id/i),"occ_12345");
        await user.clear(screen.getByLabelText(/amount paid/i));
        await user.type(screen.getByLabelText(/amount paid/i),"750.00");
        await user.type(screen.getByLabelText(/notes/i),"Paid in full");
        await user.click(screen.getByRole("button",{ name :/log payment/i }));
        await waitFor(()=>{
            expect(consoleSpy).toHaveBeenCalledWith(
            "Mock payment logged successfully: ",
            expect.objectContaining({
                occurrenceId:"occ_12345",
                amountPaid:750,
                notes:"Paid in full",
                paidDate:expect.any(Date),
            })
            );
        });
        expect(screen.getByText("Payment made!")).toBeInTheDocument();
        expect(screen.getByText("+10 xp")).toBeInTheDocument();
        vi.advanceTimersByTime(5000);
        await waitFor(()=>{
            expect(screen.queryByText("Payment made!")).not.toBeInTheDocument();
        });
        vi.useRealTimers();
        });
});