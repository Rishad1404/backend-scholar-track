import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DecisionController } from "./decision.controller";
import { DecisionValidation } from "./decision.validation";

const router = Router();

// Admin makes final decision
router.patch(
  "/:applicationId/decision",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(DecisionValidation.makeDecisionSchema),
  DecisionController.makeDecision
);

export const DecisionRoutes = router;