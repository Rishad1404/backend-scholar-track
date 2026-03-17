import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AcademicTermService } from "./term.service";

const createAcademicTerm=catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await AcademicTermService.createAcademicTerm(payload);
    sendResponse(res, {
        httpStatusCode: 200,
        success: true,
        message: "Academic term created successfully",
        data: result,
    });
});

const getAllAcademicTerms = catchAsync(async (req: Request, res: Response) => {
    const result = await AcademicTermService.getAllAcademicTerms();
    sendResponse(res, {
        httpStatusCode: 200,
        success: true,
        message: "Academic terms fetched successfully",
        data: result,
    });
});

const deleteAcademicTerm = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await AcademicTermService.deleteAcademicTerm(id as string);
    sendResponse(res, {
        httpStatusCode: 200,
        success: true,
        message: "Academic term deleted successfully",
        data: result,
    });
});

export const AcademicTermController={
    createAcademicTerm,
    getAllAcademicTerms,
    deleteAcademicTerm
}

