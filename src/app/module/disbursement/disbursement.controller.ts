import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DisbursementService } from "./disbursement.service";
import { IQueryParams } from "../../interfaces/query.interface";

const createDisbursement = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const result = await DisbursementService.createDisbursement(
      userId,
      req.body
    );
    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Disbursement created successfully",
      data: result,
    });
  }
);

const processDisbursement = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { disbursementId } = req.params;
    const result = await DisbursementService.processDisbursement(
      userId,
      disbursementId as string,
      req.body
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: `Disbursement ${req.body.action.toLowerCase()}ed successfully`,
      data: result,
    });
  }
);

const getAllDisbursements = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const result = await DisbursementService.getAllDisbursements(
      userId,
      role,
      req.query as IQueryParams
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Disbursements fetched successfully",
      data: result,
    });
  }
);

const getDisbursementById = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { disbursementId } = req.params;
    const result = await DisbursementService.getDisbursementById(
      userId,
      role,
      disbursementId as string
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Disbursement fetched successfully",
      data: result,
    });
  }
);

export const DisbursementController = {
  createDisbursement,
  processDisbursement,
  getAllDisbursements,
  getDisbursementById,
};