import { Request, Response, NextFunction } from 'express';
import {AppError} from '../types/AppError';

const resErrorProd = (err:AppError, res:Response) => {
  err.statusCode = err.statusCode || 400
  if (err.isOperational) {
    res.status(err.statusCode).json({
      message: err.message
    });
  } else {
    // log 紀錄
    console.error('出現重大錯誤', err);
    // 送出罐頭預設訊息
    res.status(500).json({
      status: 'error',
      message: '系統錯誤，請恰系統管理員'
    });
  }
};

const resErrorDev = (err: AppError, res:Response) => {
  err.statusCode = err.statusCode || 500
  res.status(err.statusCode).json({
    message: err.message,
    error: err,
    stack: err.stack
  });
};

// 統一管理錯誤處理
const handleAllError = (err :any, req:Request , res:Response, next: NextFunction) => {
  // dev
  if (process.env.NODE_ENV === 'dev') {
    return resErrorDev(err, res);
  } 
  // production
  if (err.name === 'ValidationError'){
    err.message = "資料欄位未填寫正確，請重新輸入！"
    err.isOperational = true;
    return resErrorProd(err, res)
  }
  resErrorProd(err, res) 
}
export default handleAllError