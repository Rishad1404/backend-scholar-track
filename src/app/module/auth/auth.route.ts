import { Router } from "express";
import { AuthController } from "./auth.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router=Router();

router.post("/register",AuthController.registerStudent)
router.post("/login",AuthController.loginUser)

// temporary debug route to inspect cookies sent by the browser
router.get("/debug-cookies", (req, res) => {
	res.status(200).json({ cookies: req.cookies });
});

router.get("/me",checkAuth(Role.STUDENT,Role.UNIVERSITY_ADMIN,Role.COMMITTEE_REVIEWER,Role.SUPER_ADMIN,Role.DEPARTMENT_HEAD),AuthController.getMe)
router.post("/refresh-token",AuthController.getNewToken)
router.post("/change-password",checkAuth(Role.COMMITTEE_REVIEWER,Role.DEPARTMENT_HEAD,Role.UNIVERSITY_ADMIN,Role.SUPER_ADMIN,Role.STUDENT),AuthController.changePassword)
router.post("/logout",checkAuth(Role.COMMITTEE_REVIEWER,Role.DEPARTMENT_HEAD,Role.UNIVERSITY_ADMIN,Role.SUPER_ADMIN,Role.STUDENT),AuthController.logOutUser)
router.post("/verify-email",AuthController.verifyEmail)
router.post("/forget-password",AuthController.forgetPassword)
router.post("/reset-password",AuthController.resetPassword)

export const AuthRoutes=router