import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultAcknowledgement } from '../components/simulation/ResultAcknowledgement';
import {
  activeBoardFixture,
  eventResultFixture,
  paymentResultFixture,
} from '../features/simulation/fixtures/SimulationDetail';

describe('ResultAcknowledgement', () => {
  it('renders a recovered payment with confirmed details', () => {
    render(
      <ResultAcknowledgement
        detail={paymentResultFixture}
        kind="payment"
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Payment recorded' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
    expect(screen.getByText('Status: PAID')).toBeInTheDocument();
    expect(screen.getByText('2800.00')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue' }),
    ).toBeInTheDocument();
  });

  it('renders a recovered event without inventing event details', () => {
    render(
      <ResultAcknowledgement
        detail={eventResultFixture}
        kind="event"
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Decision applied' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2800.00')).toBeInTheDocument();
    expect(screen.getByText('80.00')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected repair')).not.toBeInTheDocument();
  });

  it('renders an expired result acknowledgement', () => {
    render(
      <ResultAcknowledgement
        detail={eventResultFixture}
        kind="event"
        status="expired"
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Time ran out' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/decision deadline passed/i)).toBeInTheDocument();
  });

  it('omits unavailable payment details safely', () => {
    const detail = {
      ...paymentResultFixture,
      obligations: [],
    };

    render(
      <ResultAcknowledgement
        detail={detail}
        kind="payment"
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Payment recorded' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Obligation')).not.toBeInTheDocument();
    expect(screen.getByText('2800.00')).toBeInTheDocument();
  });

  it('only shows Continue when the server allows it', () => {
    render(
      <ResultAcknowledgement
        detail={activeBoardFixture}
        kind="payment"
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Continue' }),
    ).not.toBeInTheDocument();
  });

  it('calls the continue handler', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    render(
      <ResultAcknowledgement
        detail={paymentResultFixture}
        kind="payment"
        onContinue={onContinue}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
