import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UserService } from "./user.service";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const registerUniversityAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await UserService.registerUniversityAdmin(payload);
    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "University Admin registered successfully",
      data: result,
    });
  }
);

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers(req.query as IQueryParams);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Users fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await UserService.getUserById(userId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User fetched successfully",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await UserService.updateUserStatus(
    userId as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User status updated successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  await UserService.deleteUser(userId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User deleted successfully",
    data: null,
  });
});

export const UserController = {
  registerUniversityAdmin,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
};