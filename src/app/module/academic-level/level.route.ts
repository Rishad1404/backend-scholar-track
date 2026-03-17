import { Router } from "express";
import { AcademicLevelController } from "./level.controller";

const router=Router();

router.post("/",AcademicLevelController.createAcademicLevel)
router.get("/",AcademicLevelController.getAllAcademicLevels)
router.delete("/:id",AcademicLevelController.deleteAcademicLevel)

export const AcademicLevelRoutes=router