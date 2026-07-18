import { QuizTopic } from '@prisma/client';

export interface QuizTopicMetadata {
  name: string;
  description: string;
  teachingContent: {
    title: string;
    body: string;
    keyPoints: string[];
  };
}

export const QUIZ_TOPIC_METADATA: Record<QuizTopic, QuizTopicMetadata> = {
  [QuizTopic.BUDGETING]: {
    name: 'Budgeting',
    description: 'Learn how to plan spending and manage financial pressure.',
    teachingContent: {
      title: 'Build a plan for your money',
      body: 'A budget gives you a practical plan for allocating income across needs, wants, obligations, and savings.',
      keyPoints: [
        'List income and expenses before deciding what you can afford.',
        'Prioritise essential obligations and leave room for unexpected costs.',
        'Review your budget regularly as your circumstances change.',
      ],
    },
  },
  [QuizTopic.CREDIT_SCORE]: {
    name: 'Credit Score',
    description:
      'Learn how everyday payment behaviour affects financial health.',
    teachingContent: {
      title: 'How payment behaviour affects your score',
      body: 'Paying obligations on time gives the model positive evidence of reliable behaviour. Late or missed payments can reduce the score.',
      keyPoints: [
        'On-time payments build positive history.',
        'Late payments can reduce financial health.',
        'SpendSense uses a simulated score for education.',
      ],
    },
  },
  [QuizTopic.INTEREST]: {
    name: 'Interest',
    description: 'Learn how interest changes the cost of borrowing and saving.',
    teachingContent: {
      title: 'Understand the cost of interest',
      body: 'Interest is the cost of borrowing money or the return earned when money is saved. The rate and time both affect the final amount.',
      keyPoints: [
        'Borrowing interest increases the amount repaid.',
        'Saving interest can grow money over time.',
        'Compare rates and terms before committing.',
      ],
    },
  },
  [QuizTopic.DEBT]: {
    name: 'Debt',
    description: 'Learn how to understand and manage borrowed money.',
    teachingContent: {
      title: 'Make debt easier to manage',
      body: 'Understanding balances, interest, and due dates helps you make a realistic repayment plan and avoid avoidable financial pressure.',
      keyPoints: [
        'Keep track of every balance and due date.',
        'Prioritise payments and avoid taking on unaffordable debt.',
        'Ask for help early when repayments become difficult.',
      ],
    },
  },
  [QuizTopic.BNPL]: {
    name: 'Buy Now, Pay Later',
    description: 'Learn how instalment purchases affect future budgets.',
    teachingContent: {
      title: 'Look beyond the first instalment',
      body: 'Buy now, pay later products split a purchase into future payments. Those payments still need room in your budget when they become due.',
      keyPoints: [
        'Future instalments are real obligations.',
        'Several small plans can add up quickly.',
        'Check affordability before committing to a purchase.',
      ],
    },
  },
  [QuizTopic.SUBSCRIPTIONS]: {
    name: 'Subscriptions',
    description: 'Learn how recurring payments can shape monthly spending.',
    teachingContent: {
      title: 'Keep recurring costs visible',
      body: 'Subscriptions can be easy to overlook because each payment may be small. Reviewing them regularly helps keep recurring spending intentional.',
      keyPoints: [
        'Track recurring payments in your monthly plan.',
        'Cancel services you no longer use.',
        'Check renewal dates and price changes.',
      ],
    },
  },
};

export const QUIZ_TOPIC_REWARD_PREVIEW = { xp: 20, coins: 10 };
