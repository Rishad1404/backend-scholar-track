import { Request, Response } from "express";
import { AcademicTermService } from "./term.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createAcademicTerm = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const payload = req.body;
  
  const result = await AcademicTermService.createAcademicTerm(userId, role, payload);
  
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Academic term created successfully",
    data: result,
  });
});

const getAllAcademicTerms = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;
  const { universityId } = req.query;

  const result = await AcademicTermService.getAllAcademicTerms(
    userId, 
    role, 
    universityId as string
  );
  
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Academic terms fetched successfully",
    data: result,
  });
});

const deleteAcademicTerm = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { id } = req.params;
  
  const result = await AcademicTermService.deleteAcademicTerm(userId, role, id as string);
  
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Academic term deleted successfully",
    data: result,
  });
});

export const AcademicTermController = {
  createAcademicTerm,
  getAllAcademicTerms,
  deleteAcademicTerm,
};