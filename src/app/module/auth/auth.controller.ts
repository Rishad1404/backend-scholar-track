import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";

const registerStudent=catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await AuthService.registerStudent(payload);
    sendResponse(res, {
        httpStatusCode: 200,
        success: true,
        message: "Student registered successfully",
        data: result,
    });
});

const loginUser=catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await AuthService.loginUser(payload);
    sendResponse(res, {
        httpStatusCode: 200,
        success: true,
        message: "User logged in successfully",
        data: result,
    });
});

export const AuthController={
    registerStudent,
    loginUser
}