import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UniversityService } from "./university.service";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";


const getAllUniversities = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const query = req.query; 

  const result = await UniversityService.getAllUniversities(
    userId, 
    role, 
    query as IQueryParams
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Universities fetched successfully",
    data: result.data, 
    meta: result.meta, 
  });
});

const getUniversityById = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { universityId } = req.params;
  const result = await UniversityService.getUniversityById(
    userId,
    role,
    universityId as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "University fetched successfully",
    data: result,
  });
});

const updateUniversity = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { universityId } = req.params;

  const result = await UniversityService.updateUniversity(
    userId,
    role,
    universityId as string,
    req
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "University updated successfully",
    data: result,
  });
});

const updateUniversityStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { universityId } = req.params;
    const result = await UniversityService.updateUniversityStatus(
      universityId as string,
      req.body
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "University status updated successfully",
      data: result,
    });
  }
);

const deleteUniversity = catchAsync(async (req: Request, res: Response) => {
  const { universityId } = req.params;
  const result = await UniversityService.deleteUniversity(universityId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "University deleted successfully",
    data: result,
  });
});

const getPublicUniversities = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UniversityService.getPublicUniversities();
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Universities fetched successfully",
      data: result,
    });
  }
);

export const UniversityController = {
  getAllUniversities,
  getUniversityById,
  updateUniversity,
  updateUniversityStatus,
  deleteUniversity,
  getPublicUniversities,
};