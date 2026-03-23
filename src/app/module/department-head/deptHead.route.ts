import { Router } from "express";

import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";
import { addDepartmentHeadSchema } from "./deptHead.validation";
import { DepartmentHeadController } from "./deptHead.controller";


const router = Router();

router.post(
  "/add",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(addDepartmentHeadSchema),
  DepartmentHeadController.addDepartmentHead
);

router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  DepartmentHeadController.getAllDepartmentHeads
);

router.delete(
  "/:deptHeadId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  DepartmentHeadController.deleteDepartmentHead
);

export const DepartmentHeadRoutes = router;