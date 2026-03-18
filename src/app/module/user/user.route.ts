import { Router } from "express";
import { UserController } from "./user.controller";

import { registerUniversityAdminSchema } from "./user.validation";
import { validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.post(
  "/register/admin",
  validateRequest(registerUniversityAdminSchema),
  UserController.registerUniversityAdmin
);

export const UserRoutes = router;