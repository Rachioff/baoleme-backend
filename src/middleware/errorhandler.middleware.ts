import { NextFunction, Request, Response } from "express";
import { ResponseError } from "../util/errors";

export async function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    if (err instanceof ResponseError) {
        res.status(err.status).json({ message: err.message })
    } else {
        next(err)
    }
}