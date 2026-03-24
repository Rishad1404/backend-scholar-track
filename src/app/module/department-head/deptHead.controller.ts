import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { DepartmentHeadService } from "./deptHead.service";
import { IQueryParams } from "../../interfaces/query.interface";

const addDepartmentHead = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await DepartmentHeadService.addDepartmentHead(userId, role, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Department Head added successfully",
    data: result,
  });
});

const getAllDepartmentHeads = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const query = req.query;

  const result = await DepartmentHeadService.getAllDepartmentHeads(
    userId,
    role,
    query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Department Heads fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const deleteDepartmentHead = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { deptHeadId } = req.params;
  const result = await DepartmentHeadService.deleteDepartmentHead(
    userId,
    role,
    deptHeadId as string,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Department Head removed successfully",
    data: result,
  });
});

const getDepartmentHeadById = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { deptHeadId } = req.params;
  const result = await DepartmentHeadService.getDepartmentHeadById(
    userId,
    role,
    deptHeadId as string,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Department Head fetched successfully",
    data: result,
  });
});

const updateDepartmentHead = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { deptHeadId } = req.params;
  const result = await DepartmentHeadService.updateDepartmentHead(
    userId,
    role,
    deptHeadId as string,
    req.body,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Department Head updated successfully",
    data: result,
  });
});

export const DepartmentHeadController = {
  addDepartmentHead,
  getAllDepartmentHeads,
  deleteDepartmentHead,
  getDepartmentHeadById,
  updateDepartmentHead,
};
