import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { ScholarshipService } from "./scholarship.service";
import { sendResponse } from "../../shared/sendResponse";
import { IQueryParams } from "../../interfaces/query.interface";

const createScholarship = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await ScholarshipService.createScholarship(userId, req);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Scholarship created successfully",
    data: result,
  });
});

const getAllScholarships = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await ScholarshipService.getAllScholarships(
    userId,
    role,
    req.query as IQueryParams
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scholarships fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getScholarshipById = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { scholarshipId } = req.params;
  const result = await ScholarshipService.getScholarshipById(
    userId,
    role,
    scholarshipId as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scholarship fetched successfully",
    data: result,
  });
});

const updateScholarship = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { scholarshipId } = req.params;
  const result = await ScholarshipService.updateScholarship(
    userId,
    scholarshipId as string,
    req
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scholarship updated successfully",
    data: result,
  });
});

const changeScholarshipStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { scholarshipId } = req.params;
    const result = await ScholarshipService.changeScholarshipStatus(
      userId,
      role,
      scholarshipId as string,
      req.body
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Scholarship status updated successfully",
      data: result,
    });
  }
);

const deleteScholarship = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { scholarshipId } = req.params;
  await ScholarshipService.deleteScholarship(userId, role, scholarshipId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scholarship deleted successfully",
    data: null,
  });
});

const getPublicScholarships = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ScholarshipService.getPublicScholarships(
      req.query as IQueryParams
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Public scholarships fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);

export const ScholarshipController = {
  createScholarship,
  getAllScholarships,
  getScholarshipById,
  updateScholarship,
  changeScholarshipStatus,
  deleteScholarship,
  getPublicScholarships,
};