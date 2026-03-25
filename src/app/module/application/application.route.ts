// src/app/modules/application/application.route.ts

import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

import { ApplicationController } from "./application.controller";
import { ApplicationValidation } from "./application.validation";
import { multerUpload } from "../../../config/multer.config";

const router = Router();

// ── Student: My Applications ──
router.get(
  "/my-applications",
  checkAuth(Role.STUDENT),
  ApplicationController.getMyApplications,
);

// ── Student: Create Draft ──
router.post(
  "/",
  checkAuth(Role.STUDENT),
  validateRequest(ApplicationValidation.createApplicationSchema),
  ApplicationController.createApplication,
);

// ── Student: Upload Single Document ──
router.post(
  "/:applicationId/documents",
  checkAuth(Role.STUDENT),
  multerUpload.single("file"),
  validateRequest(ApplicationValidation.uploadDocumentSchema),
  ApplicationController.uploadDocument,
);

// ── Student: Upload Bulk Documents ──
router.post(
  "/:applicationId/documents/bulk",
  checkAuth(Role.STUDENT),
  multerUpload.array("files", 10),
  validateRequest(ApplicationValidation.uploadBulkDocumentsSchema),
  ApplicationController.uploadBulkDocuments,
);

// ── Student: Remove Document ──
router.delete(
  "/:applicationId/documents/:documentId",
  checkAuth(Role.STUDENT),
  ApplicationController.removeDocument,
);

// ── Student: Submit Draft ──
router.patch(
  "/:applicationId/submit",
  checkAuth(Role.STUDENT),
  ApplicationController.submitApplication,
);

// ── Student: Update Draft ──
router.patch(
  "/:applicationId",
  checkAuth(Role.STUDENT),
  validateRequest(ApplicationValidation.updateApplicationSchema),
  ApplicationController.updateApplication,
);

// ── Student: Delete Draft ──
router.delete(
  "/:applicationId",
  checkAuth(Role.STUDENT),
  ApplicationController.deleteApplication,
);

// ── Get All (Role-filtered) ──
router.get(
  "/",
  checkAuth(
    Role.SUPER_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.DEPARTMENT_HEAD,
    Role.COMMITTEE_REVIEWER,
  ),
  ApplicationController.getAllApplications,
);

// ── Get Single ──
router.get(
  "/:applicationId",
  checkAuth(
    Role.SUPER_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.DEPARTMENT_HEAD,
    Role.COMMITTEE_REVIEWER,
    Role.STUDENT,
  ),
  ApplicationController.getApplicationById,
);

router.post(
  "/:applicationId/ai-evaluate",
  checkAuth(Role.DEPARTMENT_HEAD, Role.COMMITTEE_REVIEWER, Role.UNIVERSITY_ADMIN),
  ApplicationController.runAiEvaluation,
);

export const ApplicationRoutes = router;
