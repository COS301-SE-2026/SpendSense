import { applyDecorators } from '@nestjs/common';
import { WagerStatus } from '@prisma/client';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

const WAGER_ID = 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f';
const CREATOR_ID = '3c1f2a10-3e2b-4a2b-9f0a-1b2c3d4e5f6a';
const OPPONENT_ID = '9f2d7f49-53a2-457c-8a50-8a9d22db83e4';
const EXAMPLE_TIME = '2026-08-10T10:00:00.000Z';
const WAGERS_PATH = '/api/v1/wagers';
const WAGER_PATH = `${WAGERS_PATH}/${WAGER_ID}`;

function errorResponse(
  status: number,
  description: string,
  message: string,
  path: string,
) {
  return ApiResponse({
    status,
    description,
    schema: {
      example: {
        statusCode: status,
        message,
        timestamp: EXAMPLE_TIME,
        path,
      },
    },
  });
}

function commonErrors(path: string) {
  return [
    errorResponse(
      401,
      'Missing or invalid Bearer token.',
      'Unauthorized',
      path,
    ),
    errorResponse(
      500,
      'Unexpected server failure.',
      'Internal server error',
      path,
    ),
  ];
}

function wagerIdParam() {
  return ApiParam({
    name: 'id',
    example: WAGER_ID,
    description: 'ID of the wager.',
  });
}

const pendingWager = {
  id: WAGER_ID,
  creatorId: CREATOR_ID,
  opponentId: OPPONENT_ID,
  taskType: 'ALL_PAYMENTS_ON_TIME',
  stakeAmount: 50,
  status: 'PENDING',
  durationDays: 7,
  invitedAt: '2026-08-09T09:00:00.000Z',
  startDate: null,
  endDate: null,
  resolvedAt: null,
  creatorOutcome: null,
  opponentOutcome: null,
  isCreator: true,
};

const activeWager = {
  id: WAGER_ID,
  creatorId: CREATOR_ID,
  creatorDisplayName: 'Kahlan',
  opponentId: OPPONENT_ID,
  opponentDisplayName: 'Rachel',
  taskType: 'ALL_PAYMENTS_ON_TIME',
  stakeAmount: 50,
  status: 'ACTIVE',
  durationDays: 7,
  invitedAt: '2026-08-09T09:00:00.000Z',
  respondedAt: '2026-08-09T10:00:00.000Z',
  startDate: '2026-08-09T10:00:00.000Z',
  endDate: '2026-08-16T10:00:00.000Z',
  resolvedAt: null,
  creatorOutcome: null,
  opponentOutcome: null,
  isCreator: true,
};

export function ApiCreateWagerDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a wager against a friend',
    }),
    ApiResponse({
      status: 201,
      description: 'The pending wager was created.',
      schema: {
        example: {
          data: pendingWager,
        },
      },
    }),
    errorResponse(
      400,
      'Opponent is not a current friend, the caller challenged themselves, or the creator has insufficient coins.',
      'You can only create wagers with current friends',
      WAGERS_PATH,
    ),
    errorResponse(
      404,
      'Opponent does not exist.',
      'Opponent not found',
      WAGERS_PATH,
    ),
    ...commonErrors(WAGERS_PATH),
  );
}

export function ApiListWagersDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List the authenticated user’s wagers',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: WagerStatus,
      description: 'Optional wager status filter.',
    }),
    ApiResponse({
      status: 200,
      description: 'Wagers where the authenticated user is a participant.',
      schema: {
        example: {
          data: [activeWager],
        },
      },
    }),
    errorResponse(
      400,
      'Invalid wager status filter.',
      'status must be one of the following values: PENDING, ACTIVE, COMPLETED, DECLINED, CANCELLED, EXPIRED',
      `${WAGERS_PATH}?status=INVALID`,
    ),
    ...commonErrors(WAGERS_PATH),
  );
}

export function ApiGetWagerDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a wager by ID',
    }),
    wagerIdParam(),
    ApiResponse({
      status: 200,
      description: 'The requested wager.',
      schema: {
        example: {
          data: activeWager,
        },
      },
    }),
    errorResponse(
      403,
      'The authenticated user is not a participant in this wager.',
      'You cannot access this wager',
      WAGER_PATH,
    ),
    errorResponse(404, 'Wager does not exist.', 'Wager not found', WAGER_PATH),
    ...commonErrors(WAGER_PATH),
  );
}

type WagerActionDocs = {
  summary: string;
  suffix: string;
  successDescription: string;
  status: string;
  badRequestDescription: string;
  badRequestMessage: string;
  forbiddenDescription: string;
  forbiddenMessage: string;
  coinBalance?: number;
};

function wagerActionDocs(options: WagerActionDocs) {
  const path = `${WAGER_PATH}${options.suffix}`;
  return applyDecorators(
    ApiOperation({
      summary: options.summary,
    }),
    wagerIdParam(),
    ApiResponse({
      status: 200,
      description: options.successDescription,
      schema: {
        example: {
          data: {
            id: WAGER_ID,
            status: options.status,
            ...(options.coinBalance !== undefined && {
              respondedAt: '2026-08-09T10:00:00.000Z',
              startDate: '2026-08-09T10:00:00.000Z',
              endDate: '2026-08-16T10:00:00.000Z',
              coinBalance: options.coinBalance,
            }),
          },
        },
      },
    }),
    errorResponse(
      400,
      options.badRequestDescription,
      options.badRequestMessage,
      path,
    ),
    errorResponse(
      403,
      options.forbiddenDescription,
      options.forbiddenMessage,
      path,
    ),
    errorResponse(404, 'Wager does not exist.', 'Wager not found', path),
    ...commonErrors(path),
  );
}

export function ApiAcceptWagerDocs() {
  return wagerActionDocs({
    summary: 'Accept a pending wager',
    suffix: '/accept',
    successDescription: 'The wager was accepted and both stakes were deducted.',
    status: 'ACTIVE',
    badRequestDescription:
      'The wager is not pending or a participant has insufficient coins.',
    badRequestMessage: 'Only a pending wager can be accepted',
    forbiddenDescription: 'Only the invited opponent can accept the wager.',
    forbiddenMessage: 'Only the invited opponent can accept this wager',
    coinBalance: 175,
  });
}

export function ApiDeclineWagerDocs() {
  return wagerActionDocs({
    summary: 'Decline a pending wager',
    suffix: '/decline',
    successDescription: 'The wager was declined.',
    status: 'DECLINED',
    badRequestDescription: 'The wager is not pending.',
    badRequestMessage: 'Only a pending wager can be declined',
    forbiddenDescription: 'Only the invited opponent can decline the wager.',
    forbiddenMessage: 'Only the invited opponent can decline this wager',
  });
}

export function ApiCancelWagerDocs() {
  return wagerActionDocs({
    summary: 'Cancel a pending wager',
    suffix: '',
    successDescription: 'The wager was cancelled.',
    status: 'CANCELLED',
    badRequestDescription: 'The wager is not pending.',
    badRequestMessage: 'Only a pending wager can be cancelled',
    forbiddenDescription: 'Only the creator can cancel the wager.',
    forbiddenMessage: 'Only the creator can cancel this wager',
  });
}
