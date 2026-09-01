type WagerStore={
    wager:{
        create:(args:{data:Record<string,unknown>})=>Promise<unknown>;
    };
};

export type WagerInput={
    creatorId:string;
    opponentId:string;
    taskType?:'ALL_PAYMENTS_ON_TIME'|'NO_MISSED_PAYMENTS'|'MAINTAIN_PAYMENT_STREAK';
    stakeAmount?:number;
    status?:'PENDING'|'ACTIVE'|'COMPLETED'|'DECLINED'|'CANCELLED'|'EXPIRED';
    durationDays?:number;
    invitedAt?:Date;
    respondedAt?:Date|null;
    startDate?:Date|null;
    endDate?:Date|null;
    resolvedAt?:Date|null;
    creatorOutcome?:'WON'|'LOST'|'DRAW'|null;
    opponentOutcome?:'WON'|'LOST'|'DRAW'|null;
    taskSnapshot?:Record<string,unknown>|null;
};

export async function createWager(
    prisma:WagerStore,
    input:WagerInput,
    ){
        return prisma.wager.create({
            data:{
                creatorId:input.creatorId,
                opponentId:input.opponentId,
                taskType:input.taskType??'ALL_PAYMENTS_ON_TIME',
                stakeAmount:input.stakeAmount??50,
                status:input.status??'PENDING',
                durationDays:input.durationDays??7,
                invitedAt:input.invitedAt??new Date(),
                respondedAt:input.respondedAt??null,
                startDate:input.startDate??null,
                endDate:input.endDate??null,
                resolvedAt:input.resolvedAt??null,
                creatorOutcome:input.creatorOutcome??null,
                opponentOutcome:input.opponentOutcome??null,
                taskSnapshot:input.taskSnapshot??undefined,
            },
        });
    }

export async function createActiveWager(
    prisma:WagerStore,
    input:Omit<WagerInput,'status'>,
    ){
        const now=new Date();
        const startDate=input.startDate??new Date(now.getTime()-24*60*60*1000);
        const endDate=input.endDate??new Date(now.getTime()-60*1000);
        return createWager(prisma,{
            ...input,
            status:'ACTIVE',
            respondedAt:input.respondedAt??startDate,
            startDate,
            endDate,
        });
    }