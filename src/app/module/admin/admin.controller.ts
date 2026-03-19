import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminService } from "./admin.service";
import status from "http-status";

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const {userId,role}=req.user
  const result = await AdminService.getAllAdmins(userId, role);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admins fetched successfully",
    data: result,
  });
});

const getAdminById = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { adminId } = req.params;
  const result = await AdminService.getAdminById(userId, role, adminId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin fetched successfully",
    data: result,
  });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { adminId } = req.params;
  const payload = req.body;
  const result = await AdminService.updateAdmin(userId, role, adminId as string, payload);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin updated successfully",
    data: result,
  });
});

const addAdminToUniversity = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user;
    const result = await AdminService.addAdminToUniversity(userId, role, req.body);
    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Admin added to university successfully",
      data: result,
    });
  }
);

export const AdminController = {
  getAllAdmins,
  getAdminById,
  updateAdmin,
  addAdminToUniversity
};