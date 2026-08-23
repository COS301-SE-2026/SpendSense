import {BadRequestException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {NotificationType,Prisma,WagerStatus} from '@prisma/client';
import {NotificationsService} from '../notifications/notifications.service';
import {PrismaService} from '../prisma/prisma.service';
import {CreateWagerDto} from './dto/create-wager.dto';

@Injectable()
export class WagersService{
    constructor(
        private readonly prisma:PrismaService,
        private readonly notificationsService:NotificationsService,
    ){}
    async createWager(creatorId:string,dto:CreateWagerDto){
        if(creatorId===dto.opponentId){
            throw new BadRequestException(
                'You cannot create a wager against yourself',
            );
        }
        const opponent=await this.prisma.user.findFirst({
            where:{
                id:dto.opponentId,
                deletedAt:null,
            },
            select:{
                id:true,
            },
        });
        if(!opponent){
            throw new NotFoundException('Opponent not found');
        }
        const [friendship,creator]=await this.prisma.$transaction([
            this.prisma.friendship.findUnique({
                where:{
                    userId_friendId:{
                        userId:creatorId,
                        friendId:dto.opponentId,
                    },
                },
                select:{
                    id:true,
                },
            }),
            this.prisma.user.findUnique({
                where:{
                    id:creatorId,
                },
                select:{
                    id:true,
                    displayName:true,
                    gamificationProfile:{
                        select:{
                            coinBalance:true,
                        },
                    },
                },
            }),
        ]);
        if(!friendship){
            throw new BadRequestException(
                'You can only create wagers with current friends',
            );
        }
        if(!creator||!creator.gamificationProfile){
            throw new NotFoundException('Creator profile not found');
        }
        if(dto.stakeAmount>creator.gamificationProfile.coinBalance){
            throw new BadRequestException(
                'Insufficient coin balance for this wager',
            );
        }
        return this.prisma.$transaction(async(tx)=>{
            const wager=await tx.wager.create({
                data:{
                    creatorId,
                    opponentId:dto.opponentId,
                    taskType:dto.taskType,
                    stakeAmount:dto.stakeAmount,
                    durationDays:dto.durationDays,
                },
                select:wagerSummarySelect,
            });
            await this.notificationsService.create({
                userId:dto.opponentId,
                type:NotificationType.WAGER_INVITE,
                title:'New wager invite',
                message:`${creator.displayName??'A friend'} invited you to a wager.`,
                sourceId:wager.id,
            },tx);
            return this.toWagerSummary(wager,creatorId);
        });
    }
    async listWagers(userId:string,status?:WagerStatus){
        const wagers=await this.prisma.wager.findMany({
            where:{
                OR:[
                    {creatorId:userId},
                    {opponentId:userId},
                ],
                ...(status?{status}:{}),
            },
            orderBy:{
                invitedAt:'desc',
            },
            select:wagerSummarySelect,
        });
        return wagers.map((wager)=>
            this.toWagerSummary(wager,userId),
        );
    }
    async getWager(userId:string,wagerId:string){
        const wager=await this.prisma.wager.findUnique({
            where:{
                id:wagerId,
            },
            select:wagerSummarySelect,
        });
        if(!wager){
            throw new NotFoundException('Wager not found');
        }
        if(wager.creatorId!==userId&&wager.opponentId!==userId){
            throw new ForbiddenException(
                'You cannot access this wager',
            );
        }
        return this.toWagerSummary(wager,userId);
    }
    private toWagerSummary(
        wager:WagerSummaryRecord,
        userId:string,
    ){
        return{
            id:wager.id,
            creatorId:wager.creatorId,
            creatorDisplayName:wager.creator.displayName??'SpendSense user',
            opponentId:wager.opponentId,
            opponentDisplayName:wager.opponent.displayName??'SpendSense user',
            taskType:wager.taskType,
            stakeAmount:wager.stakeAmount,
            status:wager.status,
            durationDays:wager.durationDays,
            invitedAt:wager.invitedAt,
            respondedAt:wager.respondedAt,
            startDate:wager.startDate,
            endDate:wager.endDate,
            resolvedAt:wager.resolvedAt,
            creatorOutcome:wager.creatorOutcome,
            opponentOutcome:wager.opponentOutcome,
            isCreator:wager.creatorId===userId,
        };
    }
}

const wagerSummarySelect={
    id:true,
    creatorId:true,
    opponentId:true,
    taskType:true,
    stakeAmount:true,
    status:true,
    durationDays:true,
    invitedAt:true,
    respondedAt:true,
    startDate:true,
    endDate:true,
    resolvedAt:true,
    creatorOutcome:true,
    opponentOutcome:true,
    creator:{
        select:{
            displayName:true,
        },
    },
    opponent:{
        select:{
            displayName:true,
        },
    },
} as const;

type WagerSummaryRecord=Prisma.WagerGetPayload<{
    select:typeof wagerSummarySelect;
}>;