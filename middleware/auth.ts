import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'
import handleSuccess from '../service/handleSuccess'
import appError from '../service/appError'
import {User} from '../models/userModel'
// 主要傳送需要紀錄的
interface Payload {
    id: string
}

// interface RequestContainUser extends Request {
//     user: any;
// }

export const isAuth = async (req:any , res:Response, next:NextFunction) => {
    // 取得 JWT 
    let token = '';
    if( 
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1]
    }
    if(!token){
        return next( appError(400, '沒有權限', next))
    }
    // 比對 jwt 是否正確
    const decode = await new Promise<Payload>((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET!, (err, payload)=>{
            if(err){
                reject(err)
            }else{
                resolve(payload as Payload)
            }
        })
    })
    // 取出使用者
    const currentUser = await User.findById(decode.id)
    if(!currentUser){
        return next( appError(400, '沒有使用者', next))
    }
    // 順帶使用者
    req.user = currentUser
    next()
}

export const generateJWT= (user: any, res:Response )=>{
    // // 產生 JWT token
    const token = jwt.sign({id:user._id}, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_DAY
    });

    user.password = undefined;
    handleSuccess(res, 
        {   message: '成功',
            user : {
                name: user.name,
                token
            }
        })
}
