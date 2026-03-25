import { NextFunction, Request, Response } from "express";
import { z } from "zod";

export const validateRequest = (zodSchema: z.ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body?.data) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        return next(new Error("Invalid JSON in 'data' field"));
      }
    }

    const parseResult = zodSchema.safeParse(req.body);

    if (!parseResult.success) {
      return next(parseResult.error);
    }

    req.body = parseResult.data;
    next();
  };
};