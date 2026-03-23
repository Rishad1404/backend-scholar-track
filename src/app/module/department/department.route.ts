import { Router } from "express";
import { DepartmentController } from "./department.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { createDepartmentSchema, updateDepartmentSchema } from "./department.validation";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get("/", DepartmentController.getAllDepartments);

router.get("/:universityId", DepartmentController.getDepartmentsByUniversityId);

router.get("/:departmentId", DepartmentController.getDepartmentById);

router.post(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(createDepartmentSchema),
  DepartmentController.createDepartment,
);

router.patch(
  "/:departmentId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(updateDepartmentSchema),
  DepartmentController.updateDepartment,
);

router.delete(
  "/:departmentId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  DepartmentController.deleteDepartment,
);

export const DepartmentRoutes = router;
