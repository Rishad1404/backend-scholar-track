import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ScreeningController } from "./screening.controller";
import { ScreeningValidation } from "./screening.validation";

const router = Router();

// Dept Head screens an application
router.post(
  "/:applicationId/screening",
  checkAuth(Role.DEPARTMENT_HEAD),
  validateRequest(ScreeningValidation.screenApplicationSchema),
  ScreeningController.screenApplication,
);

// Get screening result
router.get(
  "/:applicationId/screening",
  checkAuth(
    Role.SUPER_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.DEPARTMENT_HEAD,
    Role.COMMITTEE_REVIEWER,
    Role.STUDENT,
  ),
  ScreeningController.getScreeningByApplicationId,
);

export const ScreeningRoutes = router;
