// 自定義 錯誤
import { NextFunction } from 'express';

const appError = (
    httpCode:number, 
    errMessage:string, 
    next: NextFunction ): void => {
        const error :any = new Error(errMessage);
        error.statusCode = httpCode;
        error.isOperational = true;
    return next(error);
}

export default appError;