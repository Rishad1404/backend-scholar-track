import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { InviteService } from "./invite.service";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const sendInvite = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const result = await InviteService.sendInvite(userId, role, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Invite sent successfully",
    data: result,
  });
});

const acceptInvite = catchAsync(async (req: Request, res: Response) => {
  const result = await InviteService.acceptInvite(req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Invite accepted successfully",
    data: result,
  });
});

const getAllInvites = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const query = req.query;
  
  const result = await InviteService.getAllInvites(
    userId, 
    role, 
    query as IQueryParams
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Invites fetched successfully",
    data: result.data, // Contains the array of invites
    meta: result.meta, // Contains total, page, limit, etc.
  });
});

const cancelInvite = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { inviteId } = req.params;
  const result = await InviteService.cancelInvite(userId, role, inviteId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Invite cancelled successfully",
    data: result,
  });
});

export const InviteController = {
  sendInvite,
  acceptInvite,
  getAllInvites,
  cancelInvite,
};