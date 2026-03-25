import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { StatsController } from "./stats.controller";

const router = Router();

router.get(
  "/",
  checkAuth(
    Role.SUPER_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.DEPARTMENT_HEAD,
    Role.COMMITTEE_REVIEWER,
    Role.STUDENT,
  ),
  StatsController.getDashboardStats,
);

export const StatsRoutes = router;
