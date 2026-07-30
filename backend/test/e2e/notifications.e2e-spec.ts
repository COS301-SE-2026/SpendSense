import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createUserWithNotifications } from '../../../test-support/scenarios/notifications';
import { createApiE2eFixture } from './fixtures';

type NotificationListResponse = {
  data: {
    notifications: Array<{
      id: string;
      title: string;
      readAt: string | null;
    }>;
    pagination: { page: number; perPage: number; total: number; totalPages: number };
  };
};

type NotificationResponse = {
  data: { id: string; readAt: string | null };
};

type BulkReadResponse = {
  data: { updated: number };
};

describe('Notifications E2E', () => {
  it('GET /notifications will return the scenario users notifications newest first', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithNotifications(e2e.prisma, [
        { title: 'old notification', createdAt: new Date('2027-01-01T00:00:00.000Z') },
        { title: 'new notification', createdAt: new Date('2027-01-02T00:00:00.000Z') },
      ]);
      const token = await createE2eAccessToken(user);

      const response = await e2e.request
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as NotificationListResponse;
      expect(body.data.notifications).toHaveLength(2);
      expect(body.data.notifications[0].title).toBe('new notification');
      expect(body.data.notifications[1].title).toBe('old notification');
    } finally {
      await e2e.close();
    }
  });

  it('GET /notifications?unreadOnly=true will only return unread notifications', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithNotifications(e2e.prisma, [
        { title: 'already read', readAt: new Date() },
        { title: 'unread' },
      ]);
      const token = await createE2eAccessToken(user);

      const response = await e2e.request
        .get('/api/v1/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as NotificationListResponse;
      expect(body.data.notifications).toHaveLength(1);
      expect(body.data.notifications[0].title).toBe('unread');
    } finally {
      await e2e.close();
    }
  });

  it('PATCH /notifications/:id/read will mark a single notification as read', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, notifications } = await createUserWithNotifications(e2e.prisma, [
        { title: 'mark read' },
      ]);
      const token = await createE2eAccessToken(user);
      const [notification] = notifications;

      const response = await e2e.request
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect((response.body as NotificationResponse).data.readAt).not.toBeNull();

      const stored = await e2e.prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(stored?.readAt).not.toBeNull();
    } finally {
      await e2e.close();
    }
  });

  it('PATCH /notifications/:id/read will return a 404 for another users notification', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { notifications: notificationsA } = await createUserWithNotifications(
        e2e.prisma,
        [{ title: 'belongs to user 1' }],
        { email: 'e2e-notifications-1@example.test' },
      );
      const { user: userB } = await createUserWithNotifications(
        e2e.prisma,
        [],
        { email: 'e2e-notifications-2@example.test' },
      );
      const tokenB = await createE2eAccessToken(userB);
      const [notificationA] = notificationsA;

      await e2e.request
        .patch(`/api/v1/notifications/${notificationA.id}/read`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    } finally {
      await e2e.close();
    }
  });

  it('PATCH /notifications/read will mark multiple notifications as read', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, notifications } = await createUserWithNotifications(e2e.prisma, [
        { title: '1st unread' },
        { title: '2nd unread' },
      ]);
      const token = await createE2eAccessToken(user);
      const ids = notifications.map((notification) => notification.id);

      const response = await e2e.request
        .patch('/api/v1/notifications/read')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids })
        .expect(200);

      expect((response.body as BulkReadResponse).data.updated).toBe(2);

      const stillUnread = await e2e.prisma.notification.count({
        where: { id: { in: ids }, readAt: null },
      });
      expect(stillUnread).toBe(0);
    } finally {
      await e2e.close();
    }
  });

  it('DELETE /notifications/:id will soft delete so it no longer appears in the list', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, notifications } = await createUserWithNotifications(e2e.prisma, [
        { title: 'delete this' },
      ]);
      const token = await createE2eAccessToken(user);
      const [notification] = notifications;

      await e2e.request
        .delete(`/api/v1/notifications/${notification.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const listResponse = await e2e.request
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect((listResponse.body as NotificationListResponse).data.notifications).toHaveLength(0);
    } finally {
      await e2e.close();
    }
  });

  it('GET /notifications will reject unauthenticated requests', async () => {
    const e2e = await createApiE2eFixture();
    try {
      await e2e.request.get('/api/v1/notifications').expect(401);
    } finally {
      await e2e.close();
    }
  });

  it('DELETE /notifications will soft delete multiple notifications and return a count of the deleted', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, notifications } = await createUserWithNotifications(e2e.prisma, [
        { title: 'Bulk delete me one' },
        { title: 'Bulk delete me two' },
      ]);
      const token = await createE2eAccessToken(user);
      const ids = notifications.map((notification) => notification.id);

      const response = await e2e.request
        .delete('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids })
        .expect(200);

      expect((response.body as { data: { deleted: number } }).data.deleted).toBe(2);

      const listResponse = await e2e.request
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(
        (listResponse.body as NotificationListResponse).data.notifications,
      ).toHaveLength(0);
    } finally {
      await e2e.close();
    }
  });
});
