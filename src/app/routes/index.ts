import { Router } from "express";
import { AcademicLevelRoutes } from "../module/academic-level/level.route";
import { AcademicTermRoutes } from "../module/academic-term/term.route";
import { AuthRoutes } from "../module/auth/auth.route";

const router = Router();


router.use('/auth',AuthRoutes);
router.use('/academic-level',AcademicLevelRoutes);
router.use('/academic-term',AcademicTermRoutes);

export const IndexRoutes = router;