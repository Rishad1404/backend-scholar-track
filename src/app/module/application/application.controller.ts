import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ApplicationService } from "./application.service";
import { IQueryParams } from "../../interfaces/query.interface";
import AppError from "../../errorHelpers/AppError";
import { AiService } from "./ai.service";

// ── Helper: Extract single file data ──
const extractFileData = (file?: Express.Multer.File) => {
  if (!file) return undefined;
  return {
    fileUrl: file.path,
    publicId: file.filename,
    fileName: file.originalname,
    fileSize: file.size,
  };
};

// ── Helper: Extract multiple files data ──
const extractMultipleFilesData = (files?: Express.Multer.File[]) => {
  if (!files || files.length === 0) return undefined;
  return files.map((file) => ({
    fileUrl: file.path,
    publicId: file.filename,
    fileName: file.originalname,
    fileSize: file.size,
  }));
};

const createApplication = catchAsync(async (req: Request, res: Response) => {
  console.log("=== DEBUG ===");
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("req.body:", req.body);
  console.log("typeof req.body:", typeof req.body);

  const { userId } = req.user!;
  const result = await ApplicationService.createApplication(userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Application draft created successfully",
    data: result,
  });
});

// Single upload
const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { applicationId } = req.params;

  const fileData = extractFileData(req.file);
  if (!fileData) {
    throw new AppError(status.BAD_REQUEST, "Document file is required");
  }

  const result = await ApplicationService.uploadDocument(
    userId,
    applicationId as string,
    req.body.type,
    fileData,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Document uploaded successfully",
    data: result,
  });
});
const removeDocument = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { applicationId, documentId } = req.params;

  await ApplicationService.removeDocument(
    userId,
    applicationId as string,
    documentId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Document removed successfully",
    data: null,
  });
});


const uploadBulkDocuments = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { applicationId } = req.params;

    const files = req.files as Express.Multer.File[] | undefined;
    const filesData = extractMultipleFilesData(files);

    if (!filesData || filesData.length === 0) {
      throw new AppError(
        status.BAD_REQUEST,
        "At least one document file is required"
      );
    }

    const result = await ApplicationService.uploadBulkDocuments(
      userId,
      applicationId as string,
      req.body.types,
      filesData
    );

    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: `${result.length} document(s) uploaded successfully`,
      data: result,
    });
  }
);

const submitApplication = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { applicationId } = req.params;

  const result = await ApplicationService.submitApplication(
    userId,
    applicationId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Application submitted successfully",
    data: result,
  });
});

const updateApplication = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { applicationId } = req.params;

  const result = await ApplicationService.updateApplication(
    userId,
    applicationId as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Application updated successfully",
    data: result,
  });
});

const deleteApplication = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { applicationId } = req.params;

  await ApplicationService.deleteApplication(userId, applicationId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Application deleted successfully",
    data: null,
  });
});

const getMyApplications = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const result = await ApplicationService.getMyApplications(
    userId,
    req.query as IQueryParams,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Applications fetched successfully",
    data: result,
  });
});

const getAllApplications = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await ApplicationService.getAllApplications(
    userId,
    role,
    req.query as IQueryParams,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Applications fetched successfully",
    data: result,
  });
});

const getApplicationById = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { applicationId } = req.params;
  const result = await ApplicationService.getApplicationById(
    userId,
    role,
    applicationId as string,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Application fetched successfully",
    data: result,
  });
});

const runAiEvaluation = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { applicationId } = req.params;

  const result = await AiService.evaluateApplication(userId, applicationId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI Evaluation completed successfully",
    data: result,
  });
});

export const ApplicationController = {
  createApplication,
  uploadDocument,
  uploadBulkDocuments,
  removeDocument,
  submitApplication,
  updateApplication,
  deleteApplication,
  getMyApplications,
  getAllApplications,
  getApplicationById,
  runAiEvaluation,
};
