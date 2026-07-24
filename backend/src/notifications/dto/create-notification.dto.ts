import { NotificationType,UserEventSourceType } from "@prisma/client/edge";

export interface CreateNotificationInput {
  userId:string;
  type:NotificationType;
  title:string;
  message:string;
  sourceType?:UserEventSourceType|null;
  sourceId?:string|null;
}