type FriendshipStore={
    friendship:{
        create:(args:{data:Record<string,unknown>})=>Promise<unknown>;
        createMany:(args:{
            data:Record<string,unknown>[];
            skipDuplicates?:boolean;
        })=>Promise<unknown>;
    };
    friendRequest:{
        create:(args:{data:Record<string,unknown>})=>Promise<unknown>;
    };
};

export type FriendRequestInput={
    senderId:string;
    receiverId:string;
    status?:'PENDING'|'ACCEPTED'|'DECLINED'|'CANCELLED';
    respondedAt?:Date|null;
};

export async function createFriendRequest(
    prisma:FriendshipStore,
    input:FriendRequestInput,
    ){
        return prisma.friendRequest.create({
            data:{
                senderId:input.senderId,
                receiverId:input.receiverId,
                status:input.status ?? 'PENDING',
                respondedAt:input.respondedAt ?? null,
            },
        });
        }

export async function createMutualFriendship(
    prisma:FriendshipStore,
    userId:string,
    friendId:string,
    ){
        await prisma.friendship.createMany({
            data:[{
                userId,
                friendId,
            },{
                userId:friendId,
                friendId:userId,
            },
            ],
            skipDuplicates:true,
        });
        return{
            userId,
            friendId,
        };
    }