import { randomUUID } from 'node:crypto';
import type { Response } from 'supertest';
import { createApiE2eFixture } from './fixtures';
type SimulationOption = {
  id: string;
  affordable: boolean;
  immediateCost: string;
  feeOrDebt: string;
};
type SimulationEvent = {
  id: string;
  options: SimulationOption[];
};
type SimulationData = {
  id: string;
  status: string;
  timedMode: boolean;
  replayed: boolean;
  briefing: {
    allocationOptions: {
      id: string;
      currentAmount: string;
      savingsAmount: string;
    }[];
    obligations: { id: string; amountDue: string }[];
  };
  session: {
    status: string;
    currentDay: number;
    currentBalance: string;
    savingsBalance: string;
    pending: { type: string };
    completedAt: string | null;
  };
  allocation: { selected: { id: string } };
  obligations: { id: string; status: string; paidAt: string | null }[];
  payment: { obligationId: string; amountDue: string };
  currentEvent: SimulationEvent | null;
  completion: unknown;
  scoreLedger: unknown;
  active: unknown;
};
function data(response: Response): SimulationData {
  return (response.body as { data: SimulationData }).data;
}

describe('Simulations E2E', () => {
  it('creates a briefing and returns it as the active simulation', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const created = await api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false });
      expect(created.status).toBe(201);
      const session = data(created);
      expect(session.id).toBeDefined();
      expect(session.status).toBe('BRIEFING');
      expect(session.timedMode).toBe(false);
      expect(session.briefing.allocationOptions.length).toBeGreaterThan(0);
    } finally {
      await e2e.close();
    }
  });
  it('replays a creation request with the same idempotency key', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const key = randomUUID();
      const create = () =>
        api
          .post('/api/v1/simulations')
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', key)
          .send({ timedMode: false });
      const first = await create().expect(201);
      const second = await create().expect(201);
      expect(data(second).id).toBe(data(first).id);
      expect(data(second).replayed).toBe(true);
    } finally {
      await e2e.close();
    }
  });
  it('sets up the selected budget and persists the active session', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const created = await api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false })
        .expect(201);
      const session = data(created);
      const allocation = session.briefing.allocationOptions[0];
      const setup = await api
        .post(`/api/v1/simulations/${session.id}/setup`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ allocationId: allocation.id })
        .expect(201);
      expect(data(setup).session.status).toBe('ACTIVE');
      const detail = await api
        .get(`/api/v1/simulations/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(data(detail).session.status).toBe('ACTIVE');
      expect(data(detail).allocation.selected.id).toBe(allocation.id);
      expect(data(detail).session.currentBalance).toBe(
        allocation.currentAmount,
      );
      expect(data(detail).session.savingsBalance).toBe(
        allocation.savingsAmount,
      );
    } finally {
      await e2e.close();
    }
  });
  it('pauses and resumes an active month without losing its progress', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const created = await api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false })
        .expect(201);
      const session = data(created);
      await api
        .post(`/api/v1/simulations/${session.id}/setup`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ allocationId: session.briefing.allocationOptions[0].id })
        .expect(201);
      const paused = await api
        .patch(`/api/v1/simulations/${session.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ action: 'pause' })
        .expect(200);
      expect(data(paused).session.status).toBe('PAUSED');
      const resumed = await api
        .patch(`/api/v1/simulations/${session.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ action: 'resume' })
        .expect(200);
      expect(data(resumed).session.status).toBe('ACTIVE');
      expect(data(resumed).session.currentDay).toBe(
        data(paused).session.currentDay,
      );
    } finally {
      await e2e.close();
    }
  });
  it('discards a month and clears the active session', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const created = await api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false })
        .expect(201);
      const sessionId = data(created).id;
      const discarded = await api
        .patch(`/api/v1/simulations/${sessionId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ action: 'discard' })
        .expect(200);
      expect(data(discarded).session.status).toBe('ABANDONED');
      const active = await api
        .get('/api/v1/simulations/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(data(active).active).toBeNull();
    } finally {
      await e2e.close();
    }
  });
  it('does not let another player read a private simulation', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const first = await e2e.user();
      const second = await e2e.user();
      const created = await first.api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${first.token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false })
        .expect(201);
      await second.api
        .get(`/api/v1/simulations/${data(created).id}`)
        .set('Authorization', `Bearer ${second.token}`)
        .expect(404);
    } finally {
      await e2e.close();
    }
  });
  it('advances the simulation by one day and persists the progress', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const created = await api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false })
        .expect(201);
      const session = data(created);
      await api
        .post(`/api/v1/simulations/${session.id}/setup`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ allocationId: session.briefing.allocationOptions[0].id })
        .expect(201);
      const advanced = await api
        .post(`/api/v1/simulations/${session.id}/advance`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .expect(201);
      expect(data(advanced).session.currentDay).toBe(1);
      expect(data(advanced).session.status).toBe('ACTIVE');
      const detail = await api
        .get(`/api/v1/simulations/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(data(detail).session.currentDay).toBe(1);
    } finally {
      await e2e.close();
    }
  });
  it('pays an obligation and updates the fictional balances', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const created = await api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false })
        .expect(201);
      const session = data(created);
      const allocation = session.briefing.allocationOptions[0];
      const obligation = session.briefing.obligations[0];
      await api
        .post(`/api/v1/simulations/${session.id}/setup`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ allocationId: allocation.id })
        .expect(201);
      const paid = await api
        .post(
          `/api/v1/simulations/${session.id}/obligations/${obligation.id}/pay`,
        )
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .expect(201);
      expect(data(paid).payment.obligationId).toBe(obligation.id);
      expect(data(paid).payment.amountDue).toBe(obligation.amountDue);
      expect(data(paid).session.currentBalance).toBe(
        (
          Number(allocation.currentAmount) - Number(obligation.amountDue)
        ).toFixed(2),
      );
      expect(data(paid).session.savingsBalance).toBe(allocation.savingsAmount);
      const detail = await api
        .get(`/api/v1/simulations/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const updated = data(detail).obligations.find(
        (item) => item.id === obligation.id,
      );
      expect(updated?.status).toBe('PAID');
      expect(updated?.paidAt).not.toBeNull();
    } finally {
      await e2e.close();
    }
  });
  it('resolves a surprise event and persists the selected decision', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const created = await api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false })
        .expect(201);
      const session = data(created);
      await api
        .post(`/api/v1/simulations/${session.id}/setup`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ allocationId: session.briefing.allocationOptions[0].id })
        .expect(201);
      let detail: SimulationData;
      let event: SimulationEvent | undefined;
      for (let day = 0; day < 30; day++) {
        const current = await api
          .get(`/api/v1/simulations/${session.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        detail = data(current);
        if (detail.currentEvent) {
          event = detail.currentEvent;
          break;
        }
        if (detail.session.pending.type !== 'NONE') {
          await api
            .post(`/api/v1/simulations/${session.id}/continue`)
            .set('Authorization', `Bearer ${token}`)
            .set('Idempotency-Key', randomUUID())
            .expect(201);
          continue;
        }
        const advanced = await api
          .post(`/api/v1/simulations/${session.id}/advance`)
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', randomUUID())
          .expect(201);
        detail = data(advanced);
        if (detail.currentEvent) {
          event = detail.currentEvent;
          break;
        }
        if (detail.session.pending.type !== 'NONE') {
          await api
            .post(`/api/v1/simulations/${session.id}/continue`)
            .set('Authorization', `Bearer ${token}`)
            .set('Idempotency-Key', randomUUID())
            .expect(201);
        }
      }
      if (!event) {
        throw new Error('Expected a surprise event');
      }
      const option =
        event.options.find((item) => item.affordable) ??
        event.options.find(
          (item) => Number(item.immediateCost) + Number(item.feeOrDebt) === 0,
        );
      if (!option) {
        throw new Error('Expected an event option');
      }
      const resolved = await api
        .post(`/api/v1/simulations/${session.id}/events/${event.id}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ optionId: option.id })
        .expect(201);
      expect(data(resolved).session.pending.type).toBe('EVENT_RESULT');
      const persisted = await e2e.prisma.simulationEvent.findUnique({
        where: { id: event.id },
      });
      expect(persisted?.status).toBe('RESOLVED');
      expect(persisted?.selectedOptionId).toBe(option.id);
    } finally {
      await e2e.close();
    }
  });
  it('completes the simulated month and returns the final results', async () => {
    const e2e = await createApiE2eFixture();
    try {
      const { api, token } = await e2e.user();
      const created = await api
        .post('/api/v1/simulations')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ timedMode: false })
        .expect(201);
      const session = data(created);
      await api
        .post(`/api/v1/simulations/${session.id}/setup`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ allocationId: session.briefing.allocationOptions[0].id })
        .expect(201);
      let detail: SimulationData | undefined;
      for (let step = 0; step < 100; step++) {
        const response = await api
          .get(`/api/v1/simulations/${session.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        detail = data(response);
        if (detail.session.status === 'COMPLETED') {
          break;
        }
        if (detail.currentEvent) {
          const option = detail.currentEvent.options.find(
            (item) => Number(item.immediateCost) + Number(item.feeOrDebt) === 0,
          );
          if (!option) {
            throw new Error('Expected an event option');
          }
          await api
            .post(
              `/api/v1/simulations/${session.id}/events/${detail.currentEvent.id}/resolve`,
            )
            .set('Authorization', `Bearer ${token}`)
            .set('Idempotency-Key', randomUUID())
            .send({ optionId: option.id })
            .expect(201);
          continue;
        }
        if (detail.session.pending.type !== 'NONE') {
          await api
            .post(`/api/v1/simulations/${session.id}/continue`)
            .set('Authorization', `Bearer ${token}`)
            .set('Idempotency-Key', randomUUID())
            .expect(201);
          continue;
        }
        await api
          .post(`/api/v1/simulations/${session.id}/advance`)
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', randomUUID())
          .expect(201);
      }
      if (!detail) {
        throw new Error('Expected completed simulation details');
      }
      expect(detail.session.status).toBe('COMPLETED');
      expect(detail.session.currentDay).toBe(30);
      expect(detail.session.completedAt).not.toBeNull();
      expect(detail.completion).not.toBeNull();
      expect(detail.scoreLedger).toBeDefined();
      const persisted = await e2e.prisma.simulationSession.findUnique({
        where: { id: session.id },
      });
      expect(persisted?.status).toBe('COMPLETED');
      expect(persisted?.completionSnapshot).not.toBeNull();
    } finally {
      await e2e.close();
    }
  });
});
