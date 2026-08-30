import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createUserWithUpcomingPayment } from '../../../test-support/scenarios/payments';
import { createUserWithMissedEligibleOccurrence } from '../../../test-support/scenarios/scheduler';
import { createApiE2eFixture } from './fixtures';

type MascotProfileResp = {
  data: {
    coins: number;
    xp: number;
    mascotLevel: number;
    mascotMood: string;
    paymentStreak: number;
    longestStreak: number;
    knowledgeStreak: number;
    longestKnowledgeStreak: number;
    mascotLevelProgress: {
      currentLevelXp: number;
      xpForNextLevel: number;
      percentToNextLevel: number;
    };
    moodReason: string | null;
    equippedCosmetics: {
      slot: string;
      code: string;
      iconKey: string | null;
    }[];
  };
};

type CosmeticCatalogueResp = {
  data: {
    id: string;
    code: string;
    name: string;
    slot: string;
    cost: number;
    iconKey: string | null;
    owned: boolean;
    equipped: boolean;
  }[];
};

type PurchaseCosmeticResp = {
  data: {
    id: string;
    code: string;
    owned: boolean;
    coinBalance: number;
  };
};

type ErrorResponse = {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
};

describe('Mascot E2E', () => {
  it('will return the mascot profile page for a user', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token } = await e2e.user();

      const response = await api
        .get('/api/v1/gamification/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as MascotProfileResp;

      expect(typeof body.data.coins).toBe('number');
      expect(typeof body.data.xp).toBe('number');
      expect(typeof body.data.mascotLevel).toBe('number');
      expect(typeof body.data.mascotMood).toBe('string');

      expect(body.data.mascotLevelProgress).toEqual({
        currentLevelXp: 0,
        xpForNextLevel: 100,
        percentToNextLevel: 0,
      });

      expect(body.data.moodReason).toBeNull();
      expect(body.data.equippedCosmetics).toEqual([]);
    } finally {
      await e2e.close();
    }
  });

  it('will show available cosmetics for the user', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token } = await e2e.user();

      const response = await api
        .get('/api/v1/cosmetics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as CosmeticCatalogueResp;

      expect(body.data.length).toBeGreaterThan(0);

      const partyHat = body.data.find((item) => item.code === 'party_hat');

      expect(partyHat).toMatchObject({
        code: 'party_hat',
        name: 'Party Hat',
        slot: 'HAT',
        cost: 50,
        iconKey: 'hat_party',
        owned: false,
        equipped: false,
      });
    } finally {
      await e2e.close();
    }
  });

  it('will show that a new user does not have any cosmetics', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token } = await e2e.user();

      const response = await api
        .get('/api/v1/cosmetics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as CosmeticCatalogueResp;

      expect(body.data.every((item) => item.owned === false)).toBe(true);
    } finally {
      await e2e.close();
    }
  });

  it('will deduct coins from a users balance after a cosmetic purchase', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token, user } = await e2e.user();

      const userStored = await e2e.prisma.user.findUniqueOrThrow({
        where: {
          supabaseAuthId: user.supabaseAuthId,
        },
      });

      await e2e.prisma.gamificationProfile.upsert({
        where: {
          userId: userStored.id,
        },
        update: {
          coinBalance: 100,
        },
        create: {
          userId: userStored.id,
          coinBalance: 100,
        },
      });

      const cosmetic = await e2e.prisma.cosmeticItem.findUniqueOrThrow({
        where: {
          code: 'party_hat',
        },
      });

      const response = await api
        .post(`/api/v1/cosmetics/${cosmetic.id}/purchase`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const body = response.body as PurchaseCosmeticResp;

      expect(body.data).toEqual({
        id: cosmetic.id,
        code: 'party_hat',
        owned: true,
        coinBalance: 50,
      });

      const inventory = await e2e.prisma.userInventoryItem.findFirst({
        where: {
          userId: userStored.id,
          cosmeticItemId: cosmetic.id,
        },
      });

      expect(inventory).not.toBeNull();

      const profile = await e2e.prisma.gamificationProfile.findUniqueOrThrow({
        where: {
          userId: userStored.id,
        },
      });

      expect(profile.coinBalance).toBe(50);

      const transaction = await e2e.prisma.rewardTransaction.findFirst({
        where: {
          userId: userStored.id,
          type: 'SPENT',
        },
      });

      expect(transaction).toMatchObject({
        amount: -50,
        balanceAfter: 50,
        reason: 'Cosmetic purchase: Party Hat',
      });
    } finally {
      await e2e.close();
    }
  });

  it('will show an equipped cosmetic in the profile', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token, user } = await e2e.user();

      const userStored = await e2e.prisma.user.findUniqueOrThrow({
        where: {
          supabaseAuthId: user.supabaseAuthId,
        },
      });

      await e2e.prisma.gamificationProfile.upsert({
        where: {
          userId: userStored.id,
        },
        update: {
          coinBalance: 100,
        },
        create: {
          userId: userStored.id,
          coinBalance: 100,
        },
      });

      const cosmetic = await e2e.prisma.cosmeticItem.findUniqueOrThrow({
        where: {
          code: 'party_hat',
        },
      });

      await api
        .post(`/api/v1/cosmetics/${cosmetic.id}/purchase`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await api
        .patch(`/api/v1/cosmetics/${cosmetic.id}/equip`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const equippedProfile = await api
        .get('/api/v1/gamification/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const equippedBody = equippedProfile.body as MascotProfileResp;

      expect(equippedBody.data.equippedCosmetics).toContainEqual({
        slot: 'HAT',
        code: 'party_hat',
        iconKey: 'hat_party',
      });

      await api
        .patch(`/api/v1/cosmetics/${cosmetic.id}/unequip`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const unequippedProfile = await api
        .get('/api/v1/gamification/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const unequippedBody = unequippedProfile.body as MascotProfileResp;

      expect(unequippedBody.data.equippedCosmetics).toEqual([]);
    } finally {
      await e2e.close();
    }
  });

  it('will not allow the user to purchase an item without enough coins', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token, user } = await e2e.user();

      const userStored = await e2e.prisma.user.findUniqueOrThrow({
        where: {
          supabaseAuthId: user.supabaseAuthId,
        },
      });

      const cosmetic = await e2e.prisma.cosmeticItem.findUniqueOrThrow({
        where: {
          code: 'party_hat',
        },
      });

      await api
        .post(`/api/v1/cosmetics/${cosmetic.id}/purchase`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      const inventoryCount = await e2e.prisma.userInventoryItem.count({
        where: {
          userId: userStored.id,
          cosmeticItemId: cosmetic.id,
        },
      });

      expect(inventoryCount).toBe(0);

      const profile = await e2e.prisma.gamificationProfile.findUnique({
        where: {
          userId: userStored.id,
        },
      });

      expect(profile?.coinBalance ?? 0).toBeGreaterThanOrEqual(0);
    } finally {
      await e2e.close();
    }
  });

  it('will prevent the same cosmetic from being bought more  than once', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token, user } = await e2e.user();

      const userStored = await e2e.prisma.user.findUniqueOrThrow({
        where: {
          supabaseAuthId: user.supabaseAuthId,
        },
      });

      await e2e.prisma.gamificationProfile.upsert({
        where: {
          userId: userStored.id,
        },
        update: {
          coinBalance: 200,
        },
        create: {
          userId: userStored.id,
          coinBalance: 200,
        },
      });

      const cosmetic = await e2e.prisma.cosmeticItem.findUniqueOrThrow({
        where: {
          code: 'party_hat',
        },
      });

      await api
        .post(`/api/v1/cosmetics/${cosmetic.id}/purchase`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await api
        .post(`/api/v1/cosmetics/${cosmetic.id}/purchase`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      const inventoryCount = await e2e.prisma.userInventoryItem.count({
        where: {
          userId: userStored.id,
          cosmeticItemId: cosmetic.id,
        },
      });

      expect(inventoryCount).toBe(1);
    } finally {
      await e2e.close();
    }
  });

  it('will prevent a user from equipping a different users cosmetic item', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const first = await e2e.user();
      const second = await e2e.user();

      const firstUser = await e2e.prisma.user.findUniqueOrThrow({
        where: {
          supabaseAuthId: first.user.supabaseAuthId,
        },
      });

      await e2e.prisma.gamificationProfile.upsert({
        where: {
          userId: firstUser.id,
        },
        update: {
          coinBalance: 100,
        },
        create: {
          userId: firstUser.id,
          coinBalance: 100,
        },
      });

      const cosmetic = await e2e.prisma.cosmeticItem.findUniqueOrThrow({
        where: {
          code: 'party_hat',
        },
      });

      await first.api
        .post(`/api/v1/cosmetics/${cosmetic.id}/purchase`)
        .set('Authorization', `Bearer ${first.token}`)
        .expect(201);

      await second.api
        .patch(`/api/v1/cosmetics/${cosmetic.id}/equip`)
        .set('Authorization', `Bearer ${second.token}`)
        .expect(400);

      const firstInventory = await e2e.prisma.userInventoryItem.findFirst({
        where: {
          userId: firstUser.id,
          cosmeticItemId: cosmetic.id,
        },
      });

      expect(firstInventory?.equipped).toBe(false);
    } finally {
      await e2e.close();
    }
  });

  it('will prevent a user from equipping a cosmetic that they do not have', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token } = await e2e.user();

      const cosmetic = await e2e.prisma.cosmeticItem.findUniqueOrThrow({
        where: {
          code: 'party_hat',
        },
      });

      const response = await api
        .patch(`/api/v1/cosmetics/${cosmetic.id}/equip`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      const body = response.body as ErrorResponse;

      expect(body).toMatchObject({
        statusCode: 400,
        message: 'Cosmetic item is not owned',
      });
    } finally {
      await e2e.close();
    }
  });

  it('will keep the recent mood when the scheduler runs', async () => {
    const originalSecret = process.env.SCHEDULER_SECRET;
    process.env.SCHEDULER_SECRET = 'e2e-secret';

    const e2e = await createApiE2eFixture();

    try {
      const { token, user } = await e2e.user();

      const userStored = await e2e.prisma.user.findUniqueOrThrow({
        where: {
          supabaseAuthId: user.supabaseAuthId,
        },
      });

      const now = new Date();

      await e2e.prisma.gamificationProfile.upsert({
        where: {
          userId: userStored.id,
        },
        update: {
          mascotMood: 'HAPPY',
          mascotMoodUpdatedAt: now,
        },
        create: {
          userId: userStored.id,
          mascotMood: 'HAPPY',
          mascotMoodUpdatedAt: now,
        },
      });

      await e2e.request
        .post('/api/v1/scheduler/run')
        .set('x-scheduler-secret', 'e2e-secret')
        .expect(201);

      const profile = await e2e.request
        .get('/api/v1/gamification/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = profile.body as MascotProfileResp;

      expect(body.data.mascotMood).toBe('HAPPY');
    } finally {
      if (originalSecret === undefined) {
        delete process.env.SCHEDULER_SECRET;
      } else {
        process.env.SCHEDULER_SECRET = originalSecret;
      }

      await e2e.close();
    }
  });

  it('will celebrate a badge reward and then return to neutral after decay', async () => {
    const originalSecret = process.env.SCHEDULER_SECRET;
    process.env.SCHEDULER_SECRET = 'e2e-secret';

    const e2e = await createApiE2eFixture();

    try {
      const { user, occurrence } = await createUserWithUpcomingPayment(
        e2e.prisma,
      );

      const token = await createE2eAccessToken(user);

      await e2e.request
        .post('/api/v1/payments/log')
        .set('Authorization', `Bearer ${token}`)
        .send({
          occurrenceId: occurrence.id,
          paidDate: '2027-01-01',
          amountPaid: 1250,
          notes: 'Mascot E2E badge trigger',
        })
        .expect(201);

      const celebratingProfile = await e2e.request
        .get('/api/v1/gamification/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const celebratingBody = celebratingProfile.body as MascotProfileResp;

      expect(celebratingBody.data.mascotMood).toBe('CELEBRATING');
      expect(typeof celebratingBody.data.moodReason).toBe('string');

      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

      await e2e.prisma.gamificationProfile.update({
        where: {
          userId: user.id,
        },
        data: {
          mascotMoodUpdatedAt: twentyFiveHoursAgo,
        },
      });

      await e2e.request
        .post('/api/v1/scheduler/run')
        .set('x-scheduler-secret', 'e2e-secret')
        .expect(201);

      const neutralProfile = await e2e.request
        .get('/api/v1/gamification/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const neutralBody = neutralProfile.body as MascotProfileResp;

      expect(neutralBody.data.mascotMood).toBe('NEUTRAL');
      expect(neutralBody.data.moodReason).toBeNull();
    } finally {
      if (originalSecret === undefined) {
        delete process.env.SCHEDULER_SECRET;
      } else {
        process.env.SCHEDULER_SECRET = originalSecret;
      }

      await e2e.close();
    }
  });

  it('will be sad and reset a payment streak after missing the payment', async () => {
    const originalSecret = process.env.SCHEDULER_SECRET;
    process.env.SCHEDULER_SECRET = 'e2e-secret';

    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithMissedEligibleOccurrence(e2e.prisma);

      const token = await createE2eAccessToken(user);

      await e2e.prisma.gamificationProfile.upsert({
        where: {
          userId: user.id,
        },
        update: {
          currentPaymentStreak: 6,
        },
        create: {
          userId: user.id,
          currentPaymentStreak: 6,
        },
      });

      await e2e.request
        .post('/api/v1/scheduler/run')
        .set('x-scheduler-secret', 'e2e-secret')
        .expect(201);

      const profile = await e2e.request
        .get('/api/v1/gamification/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = profile.body as MascotProfileResp;

      expect(body.data.mascotMood).toBe('SAD');
      expect(body.data.paymentStreak).toBe(0);
      expect(body.data.moodReason).toBe('Payment occurrence missed');
    } finally {
      if (originalSecret === undefined) {
        delete process.env.SCHEDULER_SECRET;
      } else {
        process.env.SCHEDULER_SECRET = originalSecret;
      }

      await e2e.close();
    }
  });

  it('will need authentications for mascot endpoints', async () => {
    const e2e = await createApiE2eFixture();

    try {
      await e2e.request.get('/api/v1/gamification/profile').expect(401);

      await e2e.request.get('/api/v1/cosmetics').expect(401);
    } finally {
      await e2e.close();
    }
  });

  it('will return not found when purchasing a non-existant cosmetic', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { api, token } = await e2e.user();

      const response = await api
        .post('/api/v1/cosmetics/does-not-exist/purchase')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      const body = response.body as ErrorResponse;

      expect(body).toMatchObject({
        statusCode: 404,
        message: 'Cosmetic item was not found',
      });
    } finally {
      await e2e.close();
    }
  });
});
