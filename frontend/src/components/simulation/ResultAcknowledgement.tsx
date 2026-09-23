import { LongButton } from '@/components/common/LongButton';
import { CustomCard } from '@/components/ui/CustomCard';
import type { SimulationDetail } from '../../features/simulation/types';

export type ResultAcknowledgementKind = 'payment' | 'event';
export type ResultAcknowledgementStatus = 'recovered' | 'expired';

interface ResultAcknowledgementProps {
  detail: SimulationDetail;
  kind: ResultAcknowledgementKind;
  status?: ResultAcknowledgementStatus;
  onContinue: () => void;
  showContinue?: boolean;
}

const copyByKind: Record<
  ResultAcknowledgementKind,
  { title: string; message: string }
> = {
  payment: {
    title: 'Payment recorded',
    message:
      'The simulation confirmed your payment. The balances below reflect the latest server state.',
  },
  event: {
    title: 'Decision applied',
    message:
      'The simulation confirmed your event decision. The balances below reflect the latest server state.',
  },
};

export function ResultAcknowledgement({
  detail,
  kind,
  status = 'recovered',
  onContinue,
  showContinue = true,
}: ResultAcknowledgementProps) {
  const copy = copyByKind[kind];
  const obligation =
    kind === 'payment'
      ? detail.obligations.find((item) => item.id === detail.session.pending.id)
      : undefined;
  const canContinue = detail.allowedActions.includes('CONTINUE');
  const title = status === 'expired' ? 'Time ran out' : copy.title;
  const message =
    status === 'expired'
      ? 'The decision deadline passed. The simulation state below is authoritative.'
      : copy.message;

  return (
    <section aria-labelledby="simulation-result-title" className="w-full">
      <CustomCard variant="navyShaddow" size="lg">
        <div className="flex flex-col gap-6">
          <div>
            <h1
              id="simulation-result-title"
              className="text-2xl font-extrabold text-[#091828] dark:text-white"
            >
              {title}
            </h1>
            <p className="mt-2 text-sm text-[#6B6375] dark:text-[#ddbfc5]">
              {message}
            </p>
          </div>

          {obligation && (
            <div className="rounded-lg bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
              <p className="text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#a0aec0]">
                Obligation
              </p>
              <p className="mt-1 font-bold text-[#091828] dark:text-white">
                {obligation.name}
              </p>
              <p className="mt-1 text-sm text-[#6B6375] dark:text-[#ddbfc5]">
                Status: {obligation.status}
              </p>
            </div>
          )}

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
              <dt className="text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#a0aec0]">
                Current balance
              </dt>
              <dd className="mt-1 text-lg font-extrabold text-[#091828] dark:text-white">
                {detail.session.currentBalance}
              </dd>
            </div>
            <div className="rounded-lg bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
              <dt className="text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#a0aec0]">
                Savings balance
              </dt>
              <dd className="mt-1 text-lg font-extrabold text-[#091828] dark:text-white">
                {detail.session.savingsBalance}
              </dd>
            </div>
            <div className="rounded-lg bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
              <dt className="text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#a0aec0]">
                Score
              </dt>
              <dd className="mt-1 text-lg font-extrabold text-[#091828] dark:text-white">
                {detail.session.score}
              </dd>
            </div>
          </dl>

          {canContinue && showContinue && (
            <LongButton type="button" onClick={onContinue}>
              Continue
            </LongButton>
          )}
        </div>
      </CustomCard>
    </section>
  );
}