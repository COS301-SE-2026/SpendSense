import { createUser, type E2eUser } from '../factories/user';

type QuizScenarioStore={
    user:{
        findUnique:(args:{
            where:{ supabaseAuthId:string };
        }) => Promise<E2eUser|null>;
        create:(args:{ data:Record<string, unknown> }) => Promise<E2eUser>;
    };
    quizSession:{
        deleteMany:(args:{where:{userId:string;type:'DAILY'}})=>Promise<unknown>;
    };
};

type QuizBrowserUserInput={
    supabaseAuthId:string;
    email:string;
};

export async function createUserReadyForQuiz(
    prisma:QuizScenarioStore,
    input:QuizBrowserUserInput,
) {
    const existingUser=await prisma.user.findUnique({
        where:{ supabaseAuthId:input.supabaseAuthId },
    });
    const user=existingUser ?? await createUser(prisma, {
        supabaseAuthId:input.supabaseAuthId,
        email:input.email,
        displayName:'E2E Quiz User',
    });
    await prisma.quizSession.deleteMany({
        where:{userId:user.id,type:'DAILY'},
    });
    return { user };
}