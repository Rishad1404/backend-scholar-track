import { Router } from "express";
import { AcademicLevelRoutes } from "../module/academic-level/level.route";
import { AcademicTermRoutes } from "../module/academic-term/term.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";

const router = Router();


router.use('/auth',AuthRoutes);
router.use('/users',UserRoutes);
router.use('/academic-level',AcademicLevelRoutes);
router.use('/academic-term',AcademicTermRoutes);

export const IndexRoutes = router;