import { Request, Response } from "express";
import { AcademicLevelService } from "./level.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createAcademicLevel = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const payload = req.body;
  
  const result = await AcademicLevelService.createAcademicLevel(userId, role, payload);
  
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Academic level created successfully",
    data: result,
  });
});

const getAllAcademicLevels = catchAsync(async (req: Request, res: Response) => {

  const userId = req.user?.userId;
  const role = req.user?.role;
  const { universityId } = req.query;

  const result = await AcademicLevelService.getAllAcademicLevels(
    userId, 
    role, 
    universityId as string
  );
  
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Academic levels fetched successfully",
    data: result,
  });
});

const deleteAcademicLevel = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { id } = req.params;
  
  const result = await AcademicLevelService.deleteAcademicLevel(userId, role, id as string);
  
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Academic level deleted successfully",
    data: result,
  });
});

export const AcademicLevelController = {
  createAcademicLevel,
  getAllAcademicLevels,
  deleteAcademicLevel,
};