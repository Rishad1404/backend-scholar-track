import { z } from "zod";

const markMultipleAsReadSchema = z.object({
  notificationIds: z
    .array(z.uuid("Invalid notification ID"))
    .min(1, "At least one notification ID is required"),
});

export const NotificationValidation = {
  markMultipleAsReadSchema,
};