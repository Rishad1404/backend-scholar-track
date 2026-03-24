import { Router } from "express";
import { StudentController } from "./student.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

import {
  completeProfileSchema,
  updateProfileSchema,
  completeAcademicInfoSchema,
  updateAcademicInfoSchema,
  changeAcademicStatusSchema,
} from "./student.validation";
import { multerUpload } from "../../../config/multer.config";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// 🔒 Student Self Operations
router.get(
  "/my-profile",
  checkAuth(Role.STUDENT),
  StudentController.getMyProfile
);

router.post(
  "/complete-profile",
  checkAuth(Role.STUDENT),
  validateRequest(completeProfileSchema),
  StudentController.completeProfile
);


// Update profile — JSON only (no file)
router.patch(
  "/update-profile",
  checkAuth(Role.STUDENT),
  validateRequest(updateProfileSchema),
  StudentController.updateProfile
);

// Upload photo — File only
router.patch(
  "/profile-photo",
  checkAuth(Role.STUDENT),
  multerUpload.single("profilePhoto"),
  StudentController.uploadProfilePhoto
);

router.post(
  "/academic-info",
  checkAuth(Role.STUDENT),
  validateRequest(completeAcademicInfoSchema),
  StudentController.completeAcademicInfo
);

router.patch(
  "/academic-info",
  checkAuth(Role.STUDENT),
  validateRequest(updateAcademicInfoSchema),
  StudentController.updateAcademicInfo
);


router.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.DEPARTMENT_HEAD),
  StudentController.getAllStudents
);

router.get(
  "/:studentId",
  checkAuth(
    Role.SUPER_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.DEPARTMENT_HEAD,
    Role.STUDENT
  ),
  StudentController.getStudentById
);

router.patch(
  "/:studentId/academic-status",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.DEPARTMENT_HEAD),
  validateRequest(changeAcademicStatusSchema),
  StudentController.changeAcademicStatus
);

router.delete(
  "/:studentId",
  checkAuth(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN),
  StudentController.deleteStudent
);

export const StudentRoutes = router;