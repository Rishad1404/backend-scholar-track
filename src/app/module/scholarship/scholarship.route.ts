import { Router } from "express";
import { ScholarshipController } from "./scholarship.controller";
import { ScholarshipValidation } from "./scholarship.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";
import { multerUpload } from "../../../config/multer.config";

const router = Router();

router.get("/public", ScholarshipController.getPublicScholarships);

router.post(
  "/",
  checkAuth(Role.UNIVERSITY_ADMIN),
  multerUpload.single("document"),
  ScholarshipController.createScholarship,
);

router.get(
  "/",
  checkAuth(
    Role.SUPER_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.DEPARTMENT_HEAD,
    Role.COMMITTEE_REVIEWER,
    Role.STUDENT,
  ),
  ScholarshipController.getAllScholarships,
);

router.get(
  "/:scholarshipId",
  checkAuth(
    Role.SUPER_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.DEPARTMENT_HEAD,
    Role.COMMITTEE_REVIEWER,
    Role.STUDENT,
  ),
  ScholarshipController.getScholarshipById,
);

router.patch(
  "/:scholarshipId",
  checkAuth(Role.UNIVERSITY_ADMIN),
  multerUpload.single("document"),
  ScholarshipController.updateScholarship,
);

router.patch(
  "/:scholarshipId/status",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(ScholarshipValidation.changeScholarshipStatusSchema),
  ScholarshipController.changeScholarshipStatus,
);

router.delete(
  "/:scholarshipId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  ScholarshipController.deleteScholarship,
);

export const ScholarshipRoutes = router;
