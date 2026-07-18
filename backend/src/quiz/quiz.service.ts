import { Injectable, NotFoundException } from '@nestjs/common';
import { QuizTopic } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUIZ_TOPIC_METADATA,
  QUIZ_TOPIC_REWARD_PREVIEW,
} from './quiz-topics';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async listTopics() {
    const topics = Object.values(QuizTopic);
    const counts = await Promise.all(
      topics.map((topic) =>
        this.prisma.quizQuestion.count({
          where: { topic, isActive: true },
        }),
      ),
    );

    return topics.map((topic, index) => {
      const questionCount = counts[index];
      const metadata = QUIZ_TOPIC_METADATA[topic];

      return {
        key: topic,
        name: metadata.name,
        description: metadata.description,
        available: questionCount > 0,
        questionCount,
        rewardPreview:
          questionCount > 0 ? QUIZ_TOPIC_REWARD_PREVIEW : null,
      };
    });
  }

  async getTopic(topic: QuizTopic) {
    const questionCount = await this.prisma.quizQuestion.count({
      where: { topic, isActive: true },
    });

    if (questionCount === 0) {
      throw new NotFoundException('Quiz topic is not available');
    }

    const metadata = QUIZ_TOPIC_METADATA[topic];

    return {
      key: topic,
      name: metadata.name,
      description: metadata.description,
      teachingContent: metadata.teachingContent,
      available: true,
      questionCount,
    };
  }
}
