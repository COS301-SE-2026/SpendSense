import { NotificationType } from "@prisma/client/edge";

export interface CreateNotificationInput {
  userId:string;
  type:NotificationType;
  title:string;
  message:string;
  sourceType?:string|null;
  sourceId?:string|null;
}