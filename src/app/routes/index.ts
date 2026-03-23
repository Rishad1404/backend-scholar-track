import { Router } from "express";
import { AcademicLevelRoutes } from "../module/academic-level/level.route";
import { AcademicTermRoutes } from "../module/academic-term/term.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { AdminRoutes } from "../module/admin/admin.route";
import { DepartmentRoutes } from "../module/department/department.route";
import { InviteRoutes } from "../module/invite/invite.route";

const router = Router();


router.use('/auth',AuthRoutes);
router.use('/users',UserRoutes);
router.use("/admins", AdminRoutes);
router.use('/academic-level',AcademicLevelRoutes);
router.use('/academic-term',AcademicTermRoutes);
router.use("/departments", DepartmentRoutes);
router.use("/invites", InviteRoutes);

export const IndexRoutes = router;