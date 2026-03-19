import { Router } from "express";
import { AcademicTermController } from "./term.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router=Router();

router.post("/",checkAuth(Role.UNIVERSITY_ADMIN),AcademicTermController.createAcademicTerm)
router.get("/",AcademicTermController.getAllAcademicTerms)
router.delete("/:id",checkAuth(Role.UNIVERSITY_ADMIN),AcademicTermController.deleteAcademicTerm)

export const AcademicTermRoutes=router