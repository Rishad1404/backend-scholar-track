/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { AcademicLevelService } from "./level.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createAcademicLevel = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await AcademicLevelService.createAcademicLevel(payload);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Academic level created successfully",
    data: result,
  });
});

const getAllAcademicLevels = catchAsync(async (req: Request, res: Response) => {
  const result = await AcademicLevelService.getAllAcademicLevels();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Academic levels fetched successfully",
    data: result,
  });
});

const deleteAcademicLevel = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AcademicLevelService.deleteAcademicLevel(id as string);
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
