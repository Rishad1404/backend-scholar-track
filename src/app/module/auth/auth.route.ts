import { Router } from "express";
import { AuthController } from "./auth.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router=Router();

router.post("/register",AuthController.registerStudent)
router.post("/login",AuthController.loginUser)
router.get("/me",checkAuth(Role.STUDENT,Role.UNIVERSITY_ADMIN,Role.COMMITTEE_REVIEWER,Role.SUPER_ADMIN,Role.DEPARTMENT_HEAD),AuthController.getMe)

export const AuthRoutes=router