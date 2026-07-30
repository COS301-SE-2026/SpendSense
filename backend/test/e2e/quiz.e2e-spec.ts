import { createApiE2eFixture } from "./fixtures";

type QuizOptionResponse = {
    key: string;
    text: string;
};

type QuizQuestionResponse = {
    id: string;
    number?: number;
    topic: string;
    prompt: string;
    options: QuizOptionResponse[];
};

type QuizProgressResponse = {
    correct: number;
    answeredAttempts: number;
    initialQuestions: number;
    remainingQueue: number;
};

type QuizSessionResponse = {
    id: string;
    type: 'DAILY' | 'TOPIC';
    topic: string | null;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    progress: QuizProgressResponse;
    currentQuestion: QuizQuestionResponse | null;
};

type SubmitAnswerResponse = {
    sessionId: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    feedback: {
        isCorrect: boolean;
        explanation: string;
        requeued: boolean;
    };
    progress: QuizProgressResponse;
    nextQuestion: QuizQuestionResponse | null;
    result: {
        score: number;
        totalQuestions: number;
        answeredAttempts: number;
        reward: {
            xp: number;
            coins: number;
        };
        knowledgeStreak: {
            previous: number;
            current: number;
            longest: number;
            advanced: boolean;
        };
    } | null;
};

type ApiEnvelope<T> = {
    data: T;
};

function expectSafeQuestion(question: QuizQuestionResponse): void {
    expect(question).not.toHaveProperty('correctOptionKey');
    expect(question.options.length).toBeGreaterThan(0);
    for (const option of question.options) {
        expect(option).toEqual({
            key: expect.any(String),
            text: expect.any(String),
        });
    }
}

describe('Quiz E2E', () => {
    it('completes a daily quiz and prevents a second completion', async () => {
        const e2e = await createApiE2eFixture();
        try {
            const { token } = await e2e.user();
            const authorization = `Bearer ${token}`;
            const startResponse = await e2e.request
                .post('/api/v1/quiz/sessions')
                .set('Authorization', authorization)
                .send({ type: 'DAILY' })
                .expect(201);
            const session = (
                startResponse.body as ApiEnvelope<QuizSessionResponse>
            ).data;
            expect(session).toMatchObject({
                type: 'DAILY',
                topic: null,
                status: 'IN_PROGRESS',
                progress: {
                    correct: 0,
                    answeredAttempts: 0,
                    initialQuestions: 5,
                    remainingQueue: 5,
                },
            });
            let currentQuestion = session.currentQuestion;
            let finalAnswer: SubmitAnswerResponse | null = null;
            for (let attempt = 0; attempt < 10 && currentQuestion; attempt += 1) {
                expectSafeQuestion(currentQuestion);
                const storedQuestion = await e2e.prisma.quizQuestion.findUnique({
                    where: { id: currentQuestion.id },
                    select: { correctOptionKey: true },
                });
                if (!storedQuestion) {
                    throw new Error(`Seeded quiz question ${currentQuestion.id} was not found.`);
                }
                const answerResponse = await e2e.request
                    .post(`/api/v1/quiz/sessions/${session.id}/answer`)
                    .set('Authorization', authorization)
                    .send({
                        questionId: currentQuestion.id,
                        selectedOptionKey: storedQuestion.correctOptionKey,
                    })
                    .expect(201);
                const answer = (
                    answerResponse.body as ApiEnvelope<SubmitAnswerResponse>
                ).data;
                expect(answer.sessionId).toBe(session.id);
                expect(answer.feedback).toMatchObject({
                    isCorrect: true,
                    requeued: false,
                });
                expect(answer.feedback.explanation).toEqual(expect.any(String));
                finalAnswer = answer;
                if (answer.status === 'COMPLETED') {
                    break;
                }
                currentQuestion = answer.nextQuestion;
            }
            if (!finalAnswer?.result) {
                throw new Error('The daily quiz did not complete within five correct answers.');
            }
            expect(finalAnswer.status).toBe('COMPLETED');
            expect(finalAnswer.progress).toEqual({
                correct: 5,
                answeredAttempts: 5,
                initialQuestions: 5,
                remainingQueue: 0,
            });
            expect(finalAnswer.result).toMatchObject({
                score: 5,
                totalQuestions: 5,
                answeredAttempts: 5,
                reward: {
                    xp: 50,
                    coins: 25,
                },
                knowledgeStreak: {
                    advanced: true,
                },
            });
            const storedSession = await e2e.prisma.quizSession.findUnique({
                where: { id: session.id },
            });
            expect(storedSession).toMatchObject({
                status: 'COMPLETED',
                score: 5,
                totalQuestions: 5,
                xpAwarded: 50,
                coinsAwarded: 25,
            });
            const dailyResponse = await e2e.request
                .get('/api/v1/quiz/daily')
                .set('Authorization', authorization)
                .expect(200);
            expect(dailyResponse.body).toMatchObject({
                data: {
                    status: 'COMPLETED',
                    session: {
                        id: session.id,
                        status: 'COMPLETED',
                        score: 5,
                        totalQuestions: 5,
                    },
                    reward: {
                        xp: 50,
                        coins: 25,
                    },
                },
            });
            await e2e.request
                .post('/api/v1/quiz/sessions')
                .set('Authorization', authorization)
                .send({ type: 'DAILY' })
                .expect(409);
        } finally {
            await e2e.close();
        }
    });
    it('lists topics and starts the seeded Credit Score topic quiz', async () => {
        const e2e = await createApiE2eFixture();
        try {
            const { token } = await e2e.user();
            const authorization = `Bearer ${token}`;
            const topicsResponse = await e2e.request
                .get('/api/v1/quiz/topics')
                .set('Authorization', authorization)
                .expect(200);
            const topics = (
                topicsResponse.body as ApiEnvelope<
                    Array<{
                        key: string;
                        available: boolean;
                        questionCount: number;
                    }>
                >
            ).data;
            expect(topics).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        key: 'CREDIT_SCORE',
                        available: true,
                        questionCount: 5,
                    }),
                ]),
            );
            const topicResponse = await e2e.request
                .get('/api/v1/quiz/topics/CREDIT_SCORE')
                .set('Authorization', authorization)
                .expect(200);
            expect(topicResponse.body).toMatchObject({
                data: {
                    key: 'CREDIT_SCORE',
                    available: true,
                    questionCount: 5,
                    teachingContent: {
                        title: expect.any(String),
                        body: expect.any(String),
                        keyPoints: expect.any(Array),
                    },
                },
            });
            const sessionResponse = await e2e.request
                .post('/api/v1/quiz/sessions')
                .set('Authorization', authorization)
                .send({
                    type: 'TOPIC',
                    topic: 'CREDIT_SCORE',
                })
                .expect(201);
            const session = (
                sessionResponse.body as ApiEnvelope<QuizSessionResponse>
            ).data;
            expect(session).toMatchObject({
                type: 'TOPIC',
                topic: 'CREDIT_SCORE',
                status: 'IN_PROGRESS',
                progress: {
                    initialQuestions: 5,
                },
            });
            if (!session.currentQuestion) {
                throw new Error('The topic quiz did not return a current question.');
            }
            expectSafeQuestion(session.currentQuestion);
        } finally {
            await e2e.close();
        }
    });
    it('protects quiz sessions from other users and unauthenticated requests', async () => {
        const e2e = await createApiE2eFixture();
        try {
            const owner = await e2e.user();
            const otherUser = await e2e.user();
            const startResponse = await e2e.request
                .post('/api/v1/quiz/sessions')
                .set('Authorization', `Bearer ${owner.token}`)
                .send({ type: 'DAILY' })
                .expect(201);
            const session = (
                startResponse.body as ApiEnvelope<QuizSessionResponse>
            ).data;
            await e2e.request
                .get(`/api/v1/quiz/sessions/${session.id}`)
                .set('Authorization', `Bearer ${otherUser.token}`)
                .expect(404);
            await e2e.request.get('/api/v1/quiz/daily').expect(401);
        } finally {
            await e2e.close();
        }
    });
});

