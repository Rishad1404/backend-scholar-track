import { Router } from "express";
import { AcademicLevelController } from "./level.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router=Router();

router.post("/",checkAuth(Role.UNIVERSITY_ADMIN),AcademicLevelController.createAcademicLevel)
router.get("/",AcademicLevelController.getAllAcademicLevels)
router.delete("/:id",checkAuth(Role.UNIVERSITY_ADMIN),AcademicLevelController.deleteAcademicLevel)

export const AcademicLevelRoutes=router