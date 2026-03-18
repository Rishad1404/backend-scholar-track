import { Request, Response } from "express";
import status from "http-status";

export const notFound=(req:Request,res:Response)=>{
    res.status(status.NOT_FOUND).json({
        success:false,
        message:`The requested URL ${req.originalUrl} was not found on this server.`,
    })
}