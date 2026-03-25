import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

// Submit review
router.post(
  "/:applicationId/review",
  checkAuth(Role.COMMITTEE_REVIEWER),
  validateRequest(ReviewValidation.submitReviewSchema),
  ReviewController.submitReview,
);

// Update own review
router.patch(
  "/:applicationId/review",
  checkAuth(Role.COMMITTEE_REVIEWER),
  validateRequest(ReviewValidation.updateReviewSchema),
  ReviewController.updateReview,
);

// Get all reviews for an application
router.get(
  "/:applicationId/reviews",
  checkAuth(
    Role.SUPER_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.DEPARTMENT_HEAD,
    Role.COMMITTEE_REVIEWER,
    Role.STUDENT,
  ),
  ReviewController.getReviewsByApplicationId,
);

// Delete own review
router.delete(
  "/:applicationId/review",
  checkAuth(Role.COMMITTEE_REVIEWER),
  ReviewController.deleteReview,
);

export const ReviewRoutes = router;
