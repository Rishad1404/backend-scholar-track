import { Router } from "express";
import { AcademicLevelController } from "./level.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { createAcademicLevelSchema } from "./level.validation"; 
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.DEPARTMENT_HEAD, Role.STUDENT),
  AcademicLevelController.getAllAcademicLevels
);

router.post(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(createAcademicLevelSchema),
  AcademicLevelController.createAcademicLevel
);

router.delete(
  "/:id",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  AcademicLevelController.deleteAcademicLevel
);

export const AcademicLevelRoutes = router;