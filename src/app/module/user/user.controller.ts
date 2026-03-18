import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UserService } from "./user.service";
import status from "http-status";

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

export const UserController = {
  registerUniversityAdmin,
};