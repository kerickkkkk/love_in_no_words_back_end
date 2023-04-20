import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs'
import validator from 'validator'
import handleErrorAsync from '../service/handleErrorAsync'
import appError  from '../service/appError';
import {User} from '../models/userModel'
import { generateJWT } from '../middleware/auth'
import handleSuccess  from '../service/handleSuccess'
import { isoDate } from '../utils/dayjs'


export const users = {
  getUsers : handleErrorAsync( async(req:Request, res:Response,) => {
    const users = await User.find()
    handleSuccess(res, users)
  }),
  signUp : handleErrorAsync( async (req: Request, res : Response, next : NextFunction) => {  
    // 姓名 電話 職位(預設給 4 ) 密碼  
    const {name, phone, titleNo = 4, password, confirmPassword, disabled = true } = req.body
    // todo 
    // number 要自己生成 暫時不做
    // title 
    const titleMap: string[] = ['','店長', '店員', '廚師','會員']

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

    if (!validator.isInt(titleNo.toString(), { min: 1, max: 4 })) {
      return next( appError(400, '職位有誤', next))
    }

    const hasSamePhone = await User.findOne({phone})
    if(hasSamePhone !== null) {
      return next( appError(400, '電話重複', next))
    }
    let revisedAt: (null|string) = null
    if( disabled ) {
      revisedAt = isoDate()
    }else {
      revisedAt = null
    }
    const title = titleMap[titleNo]
    // 加密
    const bcryptPassword = await bcrypt.hash(password, 12)

    const newUser = await User.create({
      name, 
      phone, 
      password: bcryptPassword, 
      titleNo,
      title,
      disabled,
      revisedAt
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
    const { password, confirmPassword } = req.body
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
    handleSuccess(res, req.user)
  }),
  getUser : handleErrorAsync(async  (req:any, res: Response, next: NextFunction) => {
    const userId = req.params.id
    
    // 排除已經被軟廚的人員
    const hasRightUser =  await User.findById(userId)
    .where('isDeleted').ne(true).select('+createdAt')
    if( hasRightUser === null) {
      return next( appError(400, '查無使用者', next))
    }
    handleSuccess(res, hasRightUser)

  }),
  updateUser : handleErrorAsync( async(req:any, res: Response, next: NextFunction) => {
    const userId :string= req.params.id
    const hasRightUser =  await User.findById(userId)
    .where('isDeleted').ne(true)
  
    if( hasRightUser === null) {
      return next( appError(400, '查無使用者', next))
    }
    
    const {name, phone, titleNo = 4, password, disabled = true } = req.body
    // todo 
    // title 
    const titleMap: string[] = ['','店長', '店員', '廚師','會員']
    
    // name 不得為空
    interface IUserParam {
      name : string;
      phone : string;
      password?: string;
      titleNo : number;
      title : string;
      disabled :boolean;
      revisedAt: string;
    }
    // 驗證 
    if( !name || !phone || !titleNo ) {
      return next( appError(400, '欄位不可為空', next))
    }

    if( password !== undefined && !validator.isLength(password, {min:8})){
      return next( appError(400, '密碼長度需大於 8 碼', next))
    }

    if( !validator.isLength(phone, {min:8})){
      return next( appError(400, '電話長度需大於 8 碼', next))
    }

    if (!validator.isInt(titleNo.toString(), { min: 1, max: 4 })) {
      return next( appError(400, '職位有誤', next))
    }

    const hasSamePhone = await User.findOne({phone})
    if( hasRightUser.phone !== phone && hasSamePhone !== null) {
      return next( appError(400, '電話重複', next))
    }

    const title = titleMap[titleNo]
    const params : IUserParam = {
      name, 
      phone, 
      titleNo,
      title,
      disabled,
      revisedAt : isoDate()
    }
    if ( password ){
      const bcryptPassword = await bcrypt.hash(password, 12)
      params.password = bcryptPassword
    }
    const updateUser = await User.findByIdAndUpdate( userId, params , {
      returnDocument: 'after'
    })
    
    handleSuccess(res, {
        message: '更新成功',
        updateUser
      })
  }),
  softDeleteUser : handleErrorAsync( async(req: any, res: Response, next: NextFunction) => {
    const userId = req.params.id
    // 排除已經被軟廚的人員
    const hasRightUser =  await User.findById(userId)
    .where('isDeleted').ne(true)

    if( hasRightUser === null) {
      return next( appError(400, '查無使用者', next))
    }

    await User.findByIdAndUpdate(userId, {
      isDeleted : true,
      deletedAt: isoDate()
    } , {
      returnDocument: 'after'
    })

    handleSuccess(res, {
      message: "刪除成功"
    })
  })
}

export default users