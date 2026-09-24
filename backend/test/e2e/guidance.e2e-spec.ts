import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createUserWithGuidanceState } from '../../../test-support/scenarios/guidance';
import { createUserWithProfileProgress } from '../../../test-support/scenarios/profile';
import { createApiE2eFixture } from './fixtures';

type GuidanceStateResponse = {
  data: {
    tipsEnabled: boolean;
    dailyExpansionEnabled: boolean;
    walkthrough: { status: string; currentStep: number };
    dismissedTipIds: string[];
    updatedAt: string | null;
  };
};

type DailyGuidanceResponse = {
  data: {
    localDate: string;
    payments: {
      contributionCount: number;
      completedOccurrenceCount: number;
      totalsByCurrency: { currency: string; amount: string }[];
    };
    dailyQuiz: { status: string; sessionId: string | null };
    streaks: { payment: number; knowledge: number };
  };
};

const DISMISSIBLE_TIP = 'calendar.overdue.explainer';

describe('Mascot Guidance E2E', () => {
  describe('authentication', () => {
    it('rejects unauthenticated requests on every guidance route', async () => {
      const e2e = await createApiE2eFixture();
      try {
        await e2e.request.get('/api/v1/guidance/state').expect(401);
        await e2e.request.get('/api/v1/guidance/daily').expect(401);
        await e2e.request
          .patch('/api/v1/guidance/state')
          .send({ tipsEnabled: false })
          .expect(401);
      } finally {
        await e2e.close();
      }
    });
  });

  describe('GET /guidance/state', () => {
    it('returns the defaults for a user who has no saved guidance state', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { token, api } = await e2e.user();

        const response = await api
          .get('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const body = response.body as GuidanceStateResponse;
        expect(body.data).toEqual({
          tipsEnabled: true,
          dailyExpansionEnabled: true,
          walkthrough: { status: 'NOT_STARTED', currentStep: 0 },
          dismissedTipIds: [],
          updatedAt: null,
        });
      } finally {
        await e2e.close();
      }
    });

    it('returns the saved guidance state for the user', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user } = await createUserWithGuidanceState(
          e2e.prisma,
          {},
          {
            tipsEnabled: false,
            walkthroughStatus: 'IN_PROGRESS',
            walkthroughStep: 2,
            dismissedTipIds: [DISMISSIBLE_TIP],
          },
        );
        const token = await createE2eAccessToken(user);

        const response = await e2e.request
          .get('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const body = response.body as GuidanceStateResponse;
        expect(body.data.tipsEnabled).toBe(false);
        expect(body.data.dailyExpansionEnabled).toBe(true);
        expect(body.data.walkthrough).toEqual({
          status: 'IN_PROGRESS',
          currentStep: 2,
        });
        expect(body.data.dismissedTipIds).toEqual([DISMISSIBLE_TIP]);
        expect(body.data.updatedAt).not.toBeNull();
      } finally {
        await e2e.close();
      }
    });

    it("does not leak one user's guidance state to another", async () => {
      const e2e = await createApiE2eFixture();
      try {
        await createUserWithGuidanceState(
          e2e.prisma,
          {},
          { tipsEnabled: false },
        );
        const other = await e2e.user();

        const response = await other.api
          .get('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${other.token}`)
          .expect(200);

        expect((response.body as GuidanceStateResponse).data.tipsEnabled).toBe(
          true,
        );
      } finally {
        await e2e.close();
      }
    });
  });

  describe('PATCH /guidance/state', () => {
    it('saves the preference toggles and persists them', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user } = await createUserWithGuidanceState(e2e.prisma);
        const token = await createE2eAccessToken(user);

        const response = await e2e.request
          .patch('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .send({ tipsEnabled: false, dailyExpansionEnabled: false })
          .expect(200);

        const body = response.body as GuidanceStateResponse;
        expect(body.data.tipsEnabled).toBe(false);
        expect(body.data.dailyExpansionEnabled).toBe(false);

        const stored = await e2e.prisma.guidanceState.findUnique({
          where: { userId: user.id },
        });
        expect(stored?.tipsEnabled).toBe(false);
        expect(stored?.dailyExpansionEnabled).toBe(false);
      } finally {
        await e2e.close();
      }
    });

    it('creates the guidance state on first save and leaves other fields at their defaults', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user, token, api } = await e2e.user();

        await api
          .patch('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .send({ tipsEnabled: false })
          .expect(200);

        const stored = await e2e.prisma.guidanceState.findUnique({
          where: { userId: (user as unknown as { id: string }).id },
        });
        expect(stored).not.toBeNull();
        expect(stored?.tipsEnabled).toBe(false);
        expect(stored?.dailyExpansionEnabled).toBe(true);
        expect(stored?.walkthroughStatus).toBe('NOT_STARTED');
      } finally {
        await e2e.close();
      }
    });

    it('does not touch fields that are not in the request', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user } = await createUserWithGuidanceState(
          e2e.prisma,
          {},
          {
            tipsEnabled: false,
            walkthroughStep: 3,
            walkthroughStatus: 'IN_PROGRESS',
          },
        );
        const token = await createE2eAccessToken(user);

        const response = await e2e.request
          .patch('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .send({ dailyExpansionEnabled: false })
          .expect(200);

        const body = response.body as GuidanceStateResponse;
        expect(body.data.tipsEnabled).toBe(false);
        expect(body.data.walkthrough).toEqual({
          status: 'IN_PROGRESS',
          currentStep: 3,
        });
      } finally {
        await e2e.close();
      }
    });

    it('advances the walkthrough step and status', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user } = await createUserWithGuidanceState(e2e.prisma);
        const token = await createE2eAccessToken(user);

        await e2e.request
          .patch('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .send({ walkthrough: { status: 'IN_PROGRESS', currentStep: 1 } })
          .expect(200);

        const response = await e2e.request
          .patch('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .send({ walkthrough: { status: 'COMPLETED', currentStep: 4 } })
          .expect(200);

        expect(
          (response.body as GuidanceStateResponse).data.walkthrough,
        ).toEqual({ status: 'COMPLETED', currentStep: 4 });
      } finally {
        await e2e.close();
      }
    });

    it('replays a completed walkthrough from the first step', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user } = await createUserWithGuidanceState(
          e2e.prisma,
          {},
          { walkthroughStatus: 'COMPLETED', walkthroughStep: 4 },
        );
        const token = await createE2eAccessToken(user);

        const response = await e2e.request
          .patch('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .send({ replayWalkthrough: true })
          .expect(200);

        expect(
          (response.body as GuidanceStateResponse).data.walkthrough,
        ).toEqual({ status: 'IN_PROGRESS', currentStep: 0 });
      } finally {
        await e2e.close();
      }
    });

    it('dismisses a tip once and ignores a repeated dismissal', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user } = await createUserWithGuidanceState(e2e.prisma);
        const token = await createE2eAccessToken(user);

        for (let attempt = 0; attempt < 2; attempt += 1) {
          const response = await e2e.request
            .patch('/api/v1/guidance/state')
            .set('Authorization', `Bearer ${token}`)
            .send({ dismissTipId: DISMISSIBLE_TIP })
            .expect(200);

          expect(
            (response.body as GuidanceStateResponse).data.dismissedTipIds,
          ).toEqual([DISMISSIBLE_TIP]);
        }
      } finally {
        await e2e.close();
      }
    });

    it('resets dismissed tips', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user } = await createUserWithGuidanceState(
          e2e.prisma,
          {},
          { dismissedTipIds: [DISMISSIBLE_TIP] },
        );
        const token = await createE2eAccessToken(user);

        const response = await e2e.request
          .patch('/api/v1/guidance/state')
          .set('Authorization', `Bearer ${token}`)
          .send({ resetDismissedTips: true })
          .expect(200);

        expect(
          (response.body as GuidanceStateResponse).data.dismissedTipIds,
        ).toEqual([]);
      } finally {
        await e2e.close();
      }
    });

    describe('validation', () => {
      const invalidBodies: [string, Record<string, unknown>, number][] = [
        ['an empty body', {}, 422],
        ['an unknown tip id', { dismissTipId: 'not.a.real.tip' }, 422],
        ['a step above the maximum', { walkthrough: { currentStep: 5 } }, 400],
        ['a negative step', { walkthrough: { currentStep: -1 } }, 400],
        ['a non integer step', { walkthrough: { currentStep: 1.5 } }, 400],
        [
          'an unknown walkthrough status',
          { walkthrough: { status: 'DONE' } },
          400,
        ],
        ['a non boolean toggle', { tipsEnabled: 'yes' }, 400],
        ['an unknown property', { mascotName: 'Spendy' }, 400],
        [
          'a replay combined with a nonzero step',
          { replayWalkthrough: true, walkthrough: { currentStep: 2 } },
          422,
        ],
        [
          'a replay combined with a conflicting status',
          { replayWalkthrough: true, walkthrough: { status: 'COMPLETED' } },
          422,
        ],
      ];

      it.each(invalidBodies)(
        'rejects %s',
        async (_label, body, expectedStatus) => {
          const e2e = await createApiE2eFixture();
          try {
            const { token, api } = await e2e.user();

            await api
              .patch('/api/v1/guidance/state')
              .set('Authorization', `Bearer ${token}`)
              .send(body)
              .expect(expectedStatus);
          } finally {
            await e2e.close();
          }
        },
      );

      it('does not change the saved state when a request is rejected', async () => {
        const e2e = await createApiE2eFixture();
        try {
          const { user } = await createUserWithGuidanceState(
            e2e.prisma,
            {},
            { tipsEnabled: true },
          );
          const token = await createE2eAccessToken(user);

          await e2e.request
            .patch('/api/v1/guidance/state')
            .set('Authorization', `Bearer ${token}`)
            .send({ tipsEnabled: false, dismissTipId: 'not.a.real.tip' })
            .expect(422);

          const stored = await e2e.prisma.guidanceState.findUnique({
            where: { userId: user.id },
          });
          expect(stored?.tipsEnabled).toBe(true);
        } finally {
          await e2e.close();
        }
      });
    });
  });

  describe('GET /guidance/daily', () => {
    it('returns empty daily facts for a user with no activity', async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { token, api } = await e2e.user();

        const response = await api
          .get('/api/v1/guidance/daily')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const body = response.body as DailyGuidanceResponse;
        expect(body.data.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(body.data.payments).toEqual({
          contributionCount: 0,
          completedOccurrenceCount: 0,
          totalsByCurrency: [],
        });
        expect(body.data.dailyQuiz.status).toBe('UNAVAILABLE');
        expect(body.data.dailyQuiz.sessionId).toBeNull();
        expect(body.data.streaks).toEqual({ payment: 0, knowledge: 0 });
      } finally {
        await e2e.close();
      }
    });

    it("reports the user's current payment streak", async () => {
      const e2e = await createApiE2eFixture();
      try {
        const { user } = await createUserWithProfileProgress(
          e2e.prisma,
          {},
          { currentPaymentStreak: 12 },
        );
        const token = await createE2eAccessToken(user);

        const response = await e2e.request
          .get('/api/v1/guidance/daily')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(
          (response.body as DailyGuidanceResponse).data.streaks.payment,
        ).toBe(12);
      } finally {
        await e2e.close();
      }
    });
  });
});
