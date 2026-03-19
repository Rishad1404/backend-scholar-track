import { Router } from "express";
import { AdminController } from "./admin.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { updateAdminZodSchema } from "./admin.validation";

const router = Router();

router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  AdminController.getAllAdmins,
);

router.get(
  "/:adminId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  AdminController.getAdminById
);

router.patch(
  "/:adminId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(updateAdminZodSchema),
  AdminController.updateAdmin
);



export const AdminRoutes = router;
