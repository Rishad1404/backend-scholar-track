import { z } from "zod";
import { SubscriptionPlan } from "../../../generated/prisma/enums";

const subscriptionPlanValues = Object.values(SubscriptionPlan) as [
  string,
  ...string[],
];

const createCheckoutSchema = z.object({
  plan: z.enum(subscriptionPlanValues, {
    message: `Plan must be one of: ${subscriptionPlanValues.join(", ")}`,
  }),
});

export const SubscriptionValidation = {
  createCheckoutSchema,
};