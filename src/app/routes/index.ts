import { Router } from "express";
import { AcademicLevelRoutes } from "../module/academic-level/level.route";
import { AcademicTermRoutes } from "../module/academic-term/term.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { AdminRoutes } from "../module/admin/admin.route";
import { DepartmentRoutes } from "../module/department/department.route";
import { InviteRoutes } from "../module/invite/invite.route";
import { DepartmentHeadRoutes } from "../module/department-head/deptHead.route";
import { ReviewerRoutes } from "../module/reviewer/reviewer.route";
import { UniversityRoutes } from "../module/university/university.route";
import { StudentRoutes } from "../module/student/student.route";
import { ScholarshipRoutes } from "../module/scholarship/scholarship.route";
import { ApplicationRoutes } from "../module/application/application.route";

const router = Router();


router.use('/auth',AuthRoutes);
router.use('/users',UserRoutes);
router.use("/students", StudentRoutes);
router.use("/admins", AdminRoutes);
router.use('/academic-level',AcademicLevelRoutes);
router.use('/academic-term',AcademicTermRoutes);
router.use("/departments", DepartmentRoutes);
router.use("/department-heads", DepartmentHeadRoutes);
router.use("/reviewers", ReviewerRoutes);
router.use("/invites", InviteRoutes);
router.use("/universities", UniversityRoutes);
router.use("/scholarships", ScholarshipRoutes);
router.use("/applications", ApplicationRoutes);


export const IndexRoutes = router;