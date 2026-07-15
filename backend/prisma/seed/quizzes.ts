import { Prisma, QuizTopic, type PrismaClient } from '@prisma/client';

type OptionDefinition = readonly [key: string, text: string];

function question(
  id: string,
  topic: QuizTopic,
  prompt: string,
  correctOptionKey: string,
  explanation: string,
  options: readonly OptionDefinition[],
  difficulty = 1,
): Prisma.QuizQuestionCreateInput {
  return {
    id,
    topic,
    prompt,
    options: options.map(([key, text]) => ({ key, text })),
    correctOptionKey,
    explanation,
    difficulty,
    isActive: true,
  };
}

// Stable IDs make this seed rerunnable without creating duplicate questions.
export const quizQuestions = [
  question(
    '00000000-0000-4000-8000-000000000001',
    QuizTopic.CREDIT_SCORE,
    'Which behaviour is most likely to improve a simulated credit-health score?',
    'A',
    'Paying obligations on time provides positive evidence of reliable payment behaviour.',
    [
      ['A', 'Paying obligations on time'],
      ['B', 'Ignoring overdue payments'],
      ['C', 'Adding unnecessary obligations'],
      ['D', 'Missing every due date'],
    ],
  ),
  question(
    '00000000-0000-4000-8000-000000000002',
    QuizTopic.CREDIT_SCORE,
    'What is the likely effect of repeatedly missing payment due dates?',
    'B',
    'Repeated late or missed payments can provide negative evidence and reduce financial health in the simulation.',
    [
      ['A', 'It always increases the score'],
      ['B', 'It can reduce the simulated score'],
      ['C', 'It has no possible effect'],
      ['D', 'It removes the obligation automatically'],
    ],
  ),
  question(
    '00000000-0000-4000-8000-000000000003',
    QuizTopic.CREDIT_SCORE,
    'Why should a user track payment due dates?',
    'C',
    'Tracking due dates helps users plan their money and reduces the chance of late or missed payments.',
    [
      ['A', 'To make obligations disappear'],
      ['B', 'To avoid knowing what they owe'],
      ['C', 'To help plan and make payments on time'],
      ['D', 'To guarantee a perfect score'],
    ],
  ),
  question(
    '00000000-0000-4000-8000-000000000004',
    QuizTopic.CREDIT_SCORE,
    'What does a simulated credit score represent in SpendSense?',
    'B',
    'SpendSense uses a simulated score to teach how behaviours such as payment consistency can affect financial health.',
    [
      ['A', 'A guaranteed bank approval'],
      ['B', 'An educational representation of financial behaviour'],
      ['C', 'A user’s exact real-world credit bureau score'],
      ['D', 'The amount of money in a bank account'],
    ],
  ),
  question(
    '00000000-0000-4000-8000-000000000005',
    QuizTopic.CREDIT_SCORE,
    'Which action is the most responsible when a payment may be unaffordable?',
    'C',
    'Reviewing the budget and seeking help early gives the user more options than waiting for the payment to become overdue.',
    [
      ['A', 'Ignore the payment until it becomes overdue'],
      ['B', 'Create more obligations immediately'],
      ['C', 'Review the budget and seek help early'],
      ['D', 'Delete the reminder'],
    ],
    2,
  ),
  question(
    '00000000-0000-4000-8000-000000000006',
    QuizTopic.BUDGETING,
    'What is the main purpose of a budget?',
    'A',
    'A budget gives the user a plan for how income will be allocated across needs, wants, obligations, and savings.',
    [
      ['A', 'To plan income and spending'],
      ['B', 'To spend every available cent'],
      ['C', 'To avoid tracking obligations'],
      ['D', 'To guarantee that emergencies never happen'],
    ],
  ),
  question(
    '00000000-0000-4000-8000-000000000007',
    QuizTopic.BUDGETING,
    'Which expense should generally be prioritised first?',
    'A',
    'Essential obligations such as housing should be considered before discretionary spending.',
    [
      ['A', 'A required housing payment'],
      ['B', 'An impulse purchase'],
      ['C', 'A luxury upgrade'],
      ['D', 'An unplanned subscription'],
    ],
  ),
  question(
    '00000000-0000-4000-8000-000000000008',
    QuizTopic.BUDGETING,
    'Why is it useful to leave room in a monthly budget?',
    'B',
    'A flexible amount helps a user handle unexpected expenses without immediately relying on new debt.',
    [
      ['A', 'To make the budget impossible to follow'],
      ['B', 'To handle unexpected costs or changing needs'],
      ['C', 'To encourage unnecessary borrowing'],
      ['D', 'To hide spending from yourself'],
    ],
  ),
  question(
    '00000000-0000-4000-8000-000000000009',
    QuizTopic.BUDGETING,
    'What is a useful first step when spending is consistently higher than income?',
    'B',
    'Listing income and expenses makes it possible to identify which costs can be changed and which obligations need attention.',
    [
      ['A', 'Stop checking the budget'],
      ['B', 'List income and expenses to identify the pressure points'],
      ['C', 'Add every available subscription'],
      ['D', 'Assume the problem will solve itself'],
    ],
  ),
  question(
    '00000000-0000-4000-8000-000000000010',
    QuizTopic.BUDGETING,
    'Which practice can make a budget easier to maintain?',
    'A',
    'A budget remains useful when it is reviewed regularly and updated as income, obligations, or priorities change.',
    [
      ['A', 'Reviewing it regularly and adjusting it when circumstances change'],
      ['B', 'Only creating it once and never checking it'],
      ['C', 'Leaving out recurring payments'],
      ['D', 'Recording only large purchases'],
    ],
    2,
  ),
] satisfies Prisma.QuizQuestionCreateInput[];

export async function seedQuizzes(prisma: PrismaClient) {
  for (const quizQuestion of quizQuestions) {
    await prisma.quizQuestion.upsert({
      where: { id: quizQuestion.id },
      update: quizQuestion,
      create: quizQuestion,
    });
  }

  console.log(`Seeded ${quizQuestions.length} quiz questions.`);
}
