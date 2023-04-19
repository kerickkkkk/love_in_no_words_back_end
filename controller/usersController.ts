import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs'
import validator from 'validator'
import handleErrorAsync from '../service/handleErrorAsync'
import appError  from '../service/appError';
import {User} from '../models/userModel'
import { generateJWT } from '../middleware/auth'
import handleSuccess  from '../service/handleSuccess'

export const users = {
  getUsers : handleErrorAsync( async(req:Request, res:Response,) => {
    const users = await User.find()
    handleSuccess(res, users)
  }),
  signUp : handleErrorAsync( async (req: Request, res : Response, next : NextFunction) => {    
    const {name, phone, password, confirmPassword} = req.body
    
    // 驗證 
    if( !name || !phone || !password || !confirmPassword ) {
      return next( appError(400, '欄位不可為空', next))
    }

    if( password !== confirmPassword ) {
      return next( appError(400, '輸入密碼與確認密碼需相同', next))
    }

    if( !validator.isLength(password, {min:8})){
      return next( appError(400, '密碼長度需大於 8 碼', next))
    }

    if( !validator.isLength(phone, {min:8})){
      return next( appError(400, '電話長度需大於 8 碼', next))
    }
    
    const hasSamePhone = await User.findOne({phone})
    if(hasSamePhone !== null) {
      return next( appError(400, '電話重複', next))
    }

    // 加密
    const bcryptPassword = await bcrypt.hash(password, 12)

    const newUser = await User.create({
      name, phone, password: bcryptPassword, 
    })
  
    generateJWT( newUser, res)
  }),
  // 登入
  login : handleErrorAsync( async(req: Request, res : Response, next : NextFunction) => {
    const {phone, password} = req.body
    // 驗證 
    if( !phone || !password ) {
      return next( appError(400, '欄位不可為空', next))
    }

    if( !validator.isLength(password, {min:8})){
      return next( appError(400, '密碼長度需大於 8 碼', next))
    }

    const user : any = await User.findOne({ phone }).select('+password')
    const checkPassword = await bcrypt.compare(password, user.password)
    if(!checkPassword){
      return next( appError(400, '電話或密碼錯誤', next))
    }else{
      generateJWT(user, res)
    }
  }),

  resetPassword: handleErrorAsync(async (req:any, res: Response, next: NextFunction): Promise<void> => {
    const { password, confirmPassword} = req.body
    if(!req.user){
      return next( appError(400, '沒有使用者或者沒有權限', next))
    }
    
    // 驗證 
    if( !password || !confirmPassword ) {
      return next( appError(400, '欄位不可為空', next))
    }

    if( password !== confirmPassword ) {
      return next( appError(400, '輸入密碼與確認密碼需相同', next))
    }

    if( !validator.isLength(password, {min:8})){
      return next( appError(400, '密碼長度需大於 8 碼', next))
    }
    
    const bcryptPassword = await bcrypt.hash( password, 12)
    const user = await User.findByIdAndUpdate(req.user, {
      password: bcryptPassword,
    })
    generateJWT( user, res)
  }),
  profile : handleErrorAsync(async  (req:any, res: Response, next: NextFunction) => {
    console.log(req.user)
    handleSuccess(res, req.user)
  }),
  updateProfile : handleErrorAsync( async(req:any, res: Response, next: NextFunction) => {
    const { name, sex } = req.body
    // name 不得為空
    interface IParam {
      name: string,
      sex?: 'female' | 'male'
    }
    const params : IParam = {
      name: '',
    }

    if( !name ) {
      return next( appError(400, '欄位不可為空', next))
    }{
      params.name = name
    }

    if( sex === "" || sex ){
      params.sex = sex
    }
    const updateUser = await User.findByIdAndUpdate(req.user.id, params , {
      returnDocument: 'after'
    })
    
    handleSuccess(res, updateUser)
  })
}

export default users