import { Router } from "express";
import { InviteController } from "./invite.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { sendInviteSchema, acceptInviteSchema } from "./invite.validation";
import { Role } from "../../../generated/prisma/enums";

const router = Router();


router.post(
  "/accept",
  validateRequest(acceptInviteSchema),
  InviteController.acceptInvite
);


router.post(
  "/send",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(sendInviteSchema),
  InviteController.sendInvite
);

router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  InviteController.getAllInvites
);

router.delete(
  "/:inviteId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  InviteController.cancelInvite
);

export const InviteRoutes = router;