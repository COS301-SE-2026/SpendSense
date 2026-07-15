import { Injectable, NotFoundException } from '@nestjs/common';
import {ObligationPriority, PaymentOccurrenceStatus, PaymentRecordStatus, Prisma, ScoreEventType, UserEventSourceType, UserEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateSpendSenseScore } from './credit-score.calculator';
import {CreditScoreResult, PaymentHistoryItem} from './credit-score.types';

@Injectable()
export class CreditScoreService {}