import { Router } from "express";
import { UserController } from "./user.controller";

import { registerUniversityAdminSchema, updateUserStatusSchema } from "./user.validation";
import { validateRequest } from "../../middleware/validateRequest";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/create-university-admin",
  validateRequest(registerUniversityAdminSchema),
  UserController.registerUniversityAdmin
);

// Super Admin: Get all users
router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN),
  UserController.getAllUsers
);

// Super Admin: Get single user
router.get(
  "/:userId",
  checkAuth(Role.SUPER_ADMIN),
  UserController.getUserById
);

// Super Admin: Ban / Unban user
router.patch(
  "/:userId/status",
  checkAuth(Role.SUPER_ADMIN),
  validateRequest(updateUserStatusSchema),
  UserController.updateUserStatus
);

// Super Admin: Delete user
router.delete(
  "/:userId",
  checkAuth(Role.SUPER_ADMIN),
  UserController.deleteUser
);

export const UserRoutes = router;