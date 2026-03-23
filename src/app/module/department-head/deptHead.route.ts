import { Router } from "express";

import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";
import { addDepartmentHeadSchema, updateDepartmentHeadSchema } from "./deptHead.validation";
import { DepartmentHeadController } from "./deptHead.controller";

const router = Router();

router.post(
  "/add",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(addDepartmentHeadSchema),
  DepartmentHeadController.addDepartmentHead,
);

router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  DepartmentHeadController.getAllDepartmentHeads,
);

router.get(
  "/:deptHeadId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.DEPARTMENT_HEAD),
  DepartmentHeadController.getDepartmentHeadById,
);

router.patch(
  "/:deptHeadId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.DEPARTMENT_HEAD),
  validateRequest(updateDepartmentHeadSchema),
  DepartmentHeadController.updateDepartmentHead
);

router.delete(
  "/:deptHeadId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  DepartmentHeadController.deleteDepartmentHead,
);

export const DepartmentHeadRoutes = router;
