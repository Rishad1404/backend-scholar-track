import { Router } from "express";
import { AcademicTermController } from "./term.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { createAcademicTermSchema } from "./term.validation"; 
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN,Role.COMMITTEE_REVIEWER, Role.DEPARTMENT_HEAD, Role.STUDENT),
  AcademicTermController.getAllAcademicTerms
);

router.post(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(createAcademicTermSchema),
  AcademicTermController.createAcademicTerm
);

router.delete(
  "/:id",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  AcademicTermController.deleteAcademicTerm
);

export const AcademicTermRoutes = router;