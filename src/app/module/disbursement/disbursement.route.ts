import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DisbursementController } from "./disbursement.controller";
import { DisbursementValidation } from "./disbursement.validation";

const router = Router();

// Create disbursement
router.post(
  "/",
  checkAuth(Role.UNIVERSITY_ADMIN),
  validateRequest(DisbursementValidation.createDisbursementSchema),
  DisbursementController.createDisbursement,
);

// Process disbursement (change status)
router.patch(
  "/:disbursementId/process",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(DisbursementValidation.processDisbursementSchema),
  DisbursementController.processDisbursement,
);

// Get all disbursements
router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.STUDENT),
  DisbursementController.getAllDisbursements,
);

// Get single disbursement
router.get(
  "/:disbursementId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.STUDENT),
  DisbursementController.getDisbursementById,
);

export const DisbursementRoutes = router;
