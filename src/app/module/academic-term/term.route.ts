import { Router } from "express";
import { AcademicTermController } from "./term.controller";

const router=Router();

router.post("/",AcademicTermController.createAcademicTerm)
router.get("/",AcademicTermController.getAllAcademicTerms)
router.delete("/:id",AcademicTermController.deleteAcademicTerm)

export const AcademicTermRoutes=router