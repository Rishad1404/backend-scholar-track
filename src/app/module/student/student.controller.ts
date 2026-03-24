import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { StudentService } from "./student.service";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const completeProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await StudentService.completeProfile(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile completed successfully",
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await StudentService.updateProfile(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const uploadProfilePhoto = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await StudentService.uploadProfilePhoto(userId, req);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile photo uploaded successfully",
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await StudentService.getMyProfile(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile fetched successfully",
    data: result,
  });
});

const completeAcademicInfo = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await StudentService.completeAcademicInfo(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Academic info completed successfully",
    data: result,
  });
});

const updateAcademicInfo = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await StudentService.updateAcademicInfo(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Academic info updated successfully",
    data: result,
  });
});

const getAllStudents = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await StudentService.getAllStudents(
    userId,
    role,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Students fetched successfully",
    data: result,
  });
});

const getStudentById = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { studentId } = req.params;
  const result = await StudentService.getStudentById(userId, role, studentId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Student fetched successfully",
    data: result,
  });
});

const changeAcademicStatus = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { studentId } = req.params;
  const { academicStatus } = req.body;

  const result = await StudentService.changeAcademicStatus(
    userId,
    role,
    studentId as string,
    academicStatus,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Academic status updated successfully",
    data: result,
  });
});

const deleteStudent = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { studentId } = req.params;
  const result = await StudentService.deleteStudent(userId, role, studentId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Student deleted successfully",
    data: result,
  });
});

export const StudentController = {
  completeProfile,
  updateProfile,
  uploadProfilePhoto,
  getMyProfile,
  completeAcademicInfo,
  updateAcademicInfo,
  getAllStudents,
  getStudentById,
  changeAcademicStatus,
  deleteStudent,
};
