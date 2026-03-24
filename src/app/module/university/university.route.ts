import { Router } from "express";
import { UniversityController } from "./university.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { updateUniversityStatusSchema } from "./university.validation";
import { multerUpload } from "../../../config/multer.config";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get("/public", UniversityController.getPublicUniversities);

router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  UniversityController.getAllUniversities
);

router.get(
  "/:universityId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  UniversityController.getUniversityById
);

router.patch(
  "/:universityId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  multerUpload.single("logo"),
  UniversityController.updateUniversity
);

router.patch(
  "/:universityId/status",
  checkAuth(Role.SUPER_ADMIN),
  validateRequest(updateUniversityStatusSchema),
  UniversityController.updateUniversityStatus
);

router.delete(
  "/:universityId",
  checkAuth(Role.SUPER_ADMIN),
  UniversityController.deleteUniversity
);

export const UniversityRoutes = router;