import { Request, Response, NextFunction } from 'express';

const handleErrorAsync = ( func: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    // func 先將 async fun 帶入參數儲存
    // middleware 先接住 router 資料
    return  (req: Request, res: Response, next: NextFunction) => {
        //再執行函式，async 可再用 catch 統一捕捉
        func(req, res, next).catch(
            (error) => {
                return next(error);
            }
        );
    };
};

export default handleErrorAsync;