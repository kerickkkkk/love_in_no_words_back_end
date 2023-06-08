import { Request, Response, NextFunction } from "express";
import { checkCacheKeyExist } from "../connection/service/redis"
import handleSuccess from "../service/handleSuccess";
import dotenv from 'dotenv'
dotenv.config();

export const cache = async (req: any, res: Response, next: NextFunction) => {
    const hasCache: any = await checkCacheKeyExist(req.originalUrl)
    if (!hasCache) {
        next()
    } else {
        let msg = '成功'
        if (process.env.NODE_ENV === 'test') {
            msg += '-快取'
        }
        handleSuccess(res, msg, JSON.parse(hasCache))
    }
}