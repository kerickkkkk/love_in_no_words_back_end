import { Request, Response, NextFunction } from "express";
import { checkCacheKeyExist } from "../connection/service/redis"
import handleSuccess from "../service/handleSuccess";

export const cache = async (req: any, res: Response, next: NextFunction) => {
    const hasCache: any = await checkCacheKeyExist(req.originalUrl)
    if (hasCache === null) {
        next()
    } else {
        console.log('這是快取')
        handleSuccess(res, '成功', JSON.parse(hasCache))
    }
}