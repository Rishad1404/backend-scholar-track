import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionValidation } from "./subscription.validation";

const router = Router();

// Create checkout session
router.post(
  "/checkout",
  checkAuth(Role.UNIVERSITY_ADMIN),
  validateRequest(SubscriptionValidation.createCheckoutSchema),
  SubscriptionController.createCheckoutSession,
);

// Get subscription status
router.get(
  "/status",
  checkAuth(Role.UNIVERSITY_ADMIN),
  SubscriptionController.getSubscriptionStatus,
);

// Get payment history
router.get(
  "/payments",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  SubscriptionController.getPaymentHistory,
);

// Cancel subscription
router.post(
  "/cancel",
  checkAuth(Role.UNIVERSITY_ADMIN),
  SubscriptionController.cancelSubscription,
);

export const SubscriptionRoutes = router;
