import { Router } from "express";
import { ReviewerController } from "./reviewer.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { addReviewerSchema, updateReviewerSchema } from "./reviewer.validation";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/add",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  validateRequest(addReviewerSchema),
  ReviewerController.addReviewer
);

router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  ReviewerController.getAllReviewers
);

router.get(
  "/:reviewerId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  ReviewerController.getReviewerById
);

router.patch(
  "/:reviewerId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.COMMITTEE_REVIEWER),
  validateRequest(updateReviewerSchema),
  ReviewerController.updateReviewer
);

router.delete(
  "/:reviewerId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  ReviewerController.deleteReviewer
);

export const ReviewerRoutes = router;