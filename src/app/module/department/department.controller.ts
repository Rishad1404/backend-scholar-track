import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DepartmentService } from "./department.service";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await DepartmentService.createDepartment(userId, role, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Department created successfully",
    data: result,
  });
});

const getAllDepartments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;
  const query = req.query;

  const result = await DepartmentService.getAllDepartments(
    userId,
    role,
    query as IQueryParams
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Departments fetched successfully",
    data: result.data,
    meta: result.meta, 
  });
});

const getDepartmentsByUniversityId = catchAsync(async (req: Request, res: Response) => {
  const { universityId } = req.params

  const result = await DepartmentService.getDepartmentsByUniversityId(universityId as string)

  sendResponse(res, {
    httpStatusCode: status.OK,
    success:        true,
    message:        "Departments fetched successfully",
    data:           result,
  })
})


const getDepartmentById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;
  const { departmentId } = req.params;

  const result = await DepartmentService.getDepartmentById(
    userId,
    role,
    departmentId as string
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Department fetched successfully",
    data: result,
  });
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { departmentId } = req.params;
  const result = await DepartmentService.updateDepartment(userId, role, departmentId as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Department updated successfully",
    data: result,
  });
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { departmentId } = req.params;
  const result = await DepartmentService.deleteDepartment(userId, role, departmentId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Department deleted successfully",
    data: result,
  });
});

export const DepartmentController = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  getDepartmentsByUniversityId,
  updateDepartment,
  deleteDepartment,
};