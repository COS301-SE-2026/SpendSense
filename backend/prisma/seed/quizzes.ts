import { Prisma, QuizTopic, type PrismaClient } from '@prisma/client';

// Stable IDs make this seed rerunnable without creating duplicate questions.
export const quizQuestions = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    topic: QuizTopic.CREDIT_SCORE,
    prompt: 'Which behaviour is most likely to improve a simulated credit-health score?',
    options: [
      { key: 'A', text: 'Paying obligations on time' },
      { key: 'B', text: 'Ignoring overdue payments' },
      { key: 'C', text: 'Adding unnecessary obligations' },
      { key: 'D', text: 'Missing every due date' },
    ],
    correctOptionKey: 'A',
    explanation:
      'Paying obligations on time provides positive evidence of reliable payment behaviour.',
    difficulty: 1,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    topic: QuizTopic.CREDIT_SCORE,
    prompt: 'What is the likely effect of repeatedly missing payment due dates?',
    options: [
      { key: 'A', text: 'It always increases the score' },
      { key: 'B', text: 'It can reduce the simulated score' },
      { key: 'C', text: 'It has no possible effect' },
      { key: 'D', text: 'It removes the obligation automatically' },
    ],
    correctOptionKey: 'B',
    explanation:
      'Repeated late or missed payments can provide negative evidence and reduce financial health in the simulation.',
    difficulty: 1,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    topic: QuizTopic.CREDIT_SCORE,
    prompt: 'Why should a user track payment due dates?',
    options: [
      { key: 'A', text: 'To make obligations disappear' },
      { key: 'B', text: 'To avoid knowing what they owe' },
      { key: 'C', text: 'To help plan and make payments on time' },
      { key: 'D', text: 'To guarantee a perfect score' },
    ],
    correctOptionKey: 'C',
    explanation:
      'Tracking due dates helps users plan their money and reduces the chance of late or missed payments.',
    difficulty: 1,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    topic: QuizTopic.CREDIT_SCORE,
    prompt: 'What does a simulated credit score represent in SpendSense?',
    options: [
      { key: 'A', text: 'A guaranteed bank approval' },
      { key: 'B', text: 'An educational representation of financial behaviour' },
      { key: 'C', text: 'A user’s exact real-world credit bureau score' },
      { key: 'D', text: 'The amount of money in a bank account' },
    ],
    correctOptionKey: 'B',
    explanation:
      'SpendSense uses a simulated score to teach how behaviours such as payment consistency can affect financial health.',
    difficulty: 1,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    topic: QuizTopic.CREDIT_SCORE,
    prompt: 'Which action is the most responsible when a payment may be unaffordable?',
    options: [
      { key: 'A', text: 'Ignore the payment until it becomes overdue' },
      { key: 'B', text: 'Create more obligations immediately' },
      { key: 'C', text: 'Review the budget and seek help early' },
      { key: 'D', text: 'Delete the reminder' },
    ],
    correctOptionKey: 'C',
    explanation:
      'Reviewing the budget and seeking help early gives the user more options than waiting for the payment to become overdue.',
    difficulty: 2,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    topic: QuizTopic.BUDGETING,
    prompt: 'What is the main purpose of a budget?',
    options: [
      { key: 'A', text: 'To plan income and spending' },
      { key: 'B', text: 'To spend every available cent' },
      { key: 'C', text: 'To avoid tracking obligations' },
      { key: 'D', text: 'To guarantee that emergencies never happen' },
    ],
    correctOptionKey: 'A',
    explanation:
      'A budget gives the user a plan for how income will be allocated across needs, wants, obligations, and savings.',
    difficulty: 1,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    topic: QuizTopic.BUDGETING,
    prompt: 'Which expense should generally be prioritised first?',
    options: [
      { key: 'A', text: 'A required housing payment' },
      { key: 'B', text: 'An impulse purchase' },
      { key: 'C', text: 'A luxury upgrade' },
      { key: 'D', text: 'An unplanned subscription' },
    ],
    correctOptionKey: 'A',
    explanation:
      'Essential obligations such as housing should be considered before discretionary spending.',
    difficulty: 1,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    topic: QuizTopic.BUDGETING,
    prompt: 'Why is it useful to leave room in a monthly budget?',
    options: [
      { key: 'A', text: 'To make the budget impossible to follow' },
      { key: 'B', text: 'To handle unexpected costs or changing needs' },
      { key: 'C', text: 'To encourage unnecessary borrowing' },
      { key: 'D', text: 'To hide spending from yourself' },
    ],
    correctOptionKey: 'B',
    explanation:
      'A flexible amount helps a user handle unexpected expenses without immediately relying on new debt.',
    difficulty: 1,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    topic: QuizTopic.BUDGETING,
    prompt: 'What is a useful first step when spending is consistently higher than income?',
    options: [
      { key: 'A', text: 'Stop checking the budget' },
      { key: 'B', text: 'List income and expenses to identify the pressure points' },
      { key: 'C', text: 'Add every available subscription' },
      { key: 'D', text: 'Assume the problem will solve itself' },
    ],
    correctOptionKey: 'B',
    explanation:
      'Listing income and expenses makes it possible to identify which costs can be changed and which obligations need attention.',
    difficulty: 1,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    topic: QuizTopic.BUDGETING,
    prompt: 'Which practice can make a budget easier to maintain?',
    options: [
      { key: 'A', text: 'Reviewing it regularly and adjusting it when circumstances change' },
      { key: 'B', text: 'Only creating it once and never checking it' },
      { key: 'C', text: 'Leaving out recurring payments' },
      { key: 'D', text: 'Recording only large purchases' },
    ],
    correctOptionKey: 'A',
    explanation:
      'A budget remains useful when it is reviewed regularly and updated as income, obligations, or priorities change.',
    difficulty: 2,
    isActive: true,
  },
] satisfies Prisma.QuizQuestionCreateInput[];

export async function seedQuizzes(prisma: PrismaClient) {
  for (const question of quizQuestions) {
    await prisma.quizQuestion.upsert({
      where: { id: question.id },
      update: question,
      create: question,
    });
  }

  console.log(`Seeded ${quizQuestions.length} quiz questions.`);
}
