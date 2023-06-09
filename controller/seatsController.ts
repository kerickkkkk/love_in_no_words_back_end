import { Request, Response, NextFunction } from "express";
import validator from "validator";
import handleErrorAsync from "../service/handleErrorAsync";
import { autoIncrementNumber } from "../utils/modelsExtensions";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import TableManagementModel from "../models/tableManagementModel";
// import TableCodeModel from "../models/tableCodeModel";
import { Message } from "../constants/messages";

export const seats = {
  getSeats: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const seats = await TableManagementModel.find({ isDeleted: false }).sort({ tableName: 1 });
      // .populate({
      //   path: 'tableCode',
      //   select: "seatsType seats"
      // })
      handleSuccess(res, "成功", seats);
    }
  ),
  // 座位
  // 簡易的處理
  createSeat: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { tableName, seats } = req.body;

      const tableNo = await autoIncrementNumber(TableManagementModel)

      const tableManagementObj = await TableManagementModel.findOne({ tableNo })
      if (tableManagementObj !== null) {
        return next(appError(400, '重複座位編號', next));
      }

      // 空直要篩掉不然驗證會出錯
      if (!tableName || !seats) {
        return next(appError(400, '請填桌子名稱，或者人數上限', next));
      }

      const errorMsgArray: string[] = []
      // 座位人數上限最大二十人
      if (seats && !validator.isInt(seats.toString(), { min: 1, max: 20 })) {
        errorMsgArray.push("座位人數最大上限 20 人");
      }
      const hasSameTableName = await TableManagementModel.findOne({
        tableName,
        isDeleted: false,
      })
      if (hasSameTableName) {
        errorMsgArray.push('有相同座位名稱');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const newSeat = await TableManagementModel.create({
        tableNo,
        tableName,
        seats,
        // tableCode: tableCodeObj?._id,
        isWindowSeat: false,
        isDisabled: false
      });
      return handleSuccess(res, Message.RESULT_SUCCESS, newSeat);
    }
  ),
  patchSeat: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { tableNo } = req.params;
      const { tableName, seats, isWindowSeat = false, isDisabled = false } = req.body
      const errorMsgArray: string[] = []

      // 空直要篩掉不然驗證會出錯
      if (!tableName || !seats) {
        return next(appError(400, '請填桌子名稱，或者人數上限', next));
      }
      if (!tableNo) {
        errorMsgArray.push('桌號資訊為空');
      }

      // 保留 座位資訊
      // const tableCodeObj = await TableCodeModel.findOne({
      //   seatsType,
      //   isDisabled: false,
      //   isDeleted: false
      // })
      // if (tableCodeObj === null) {
      //   errorMsgArray.push('無此座位類型');
      // }

      if (typeof isDisabled !== 'boolean') {
        errorMsgArray.push('是否靠窗請以布林值輸入');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const updatedSeat = await TableManagementModel.findOneAndUpdate(
        {
          tableNo,
          isDeleted: false,
        },
        {
          // tableCode: tableCodeObj?._id,
          seats,
          tableName,
          isWindowSeat,
          isDisabled
        },
        {
          returnDocument: "after",
        }
      );
      if (updatedSeat === null) {
        errorMsgArray.push('請輸入店家命名桌號');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      return handleSuccess(res, "座位修改成功", updatedSeat);
    }
  ),
  softDeleteSeat: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { tableNo } = req.params;

      const errorMsgArray: string[] = []

      if (!tableNo) {
        errorMsgArray.push('無該桌號資料');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const updatedSeat = await TableManagementModel.findOneAndUpdate(
        {
          tableNo,
          isDeleted: false,
        },
        {
          isDeleted: true
        },
        {
          returnDocument: "after",
        }
      );
      if (updatedSeat === null) {
        errorMsgArray.push('請輸入店家命名桌號');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      return handleSuccess(res, "刪除成功", updatedSeat);
    }
  ),
  // 保留座位功能 改成直接寫入 seats 座位人數上限
  // // 取得座位人數上限
  // getTableCode: handleErrorAsync(
  //   async (req: any, res: Response, next: NextFunction) => {
  //     const seats = await TableCodeModel.find({ isDeleted: false }).sort({ seats: 1 });
  //     handleSuccess(res, "成功", seats);
  //   }),
  // createTableCode: handleErrorAsync(
  //   async (req: any, res: Response, next: NextFunction) => {
  //     const { seats } = req.body;

  //     const errorMsgArray: string[] = []

  //     if (!seats) {
  //       errorMsgArray.push('座位上限不得為空');
  //     }

  //     // 如果有錯誤訊息有返回400
  //     if (errorMsgArray.length > 0) {
  //       return next(appError(400, errorMsgArray.join(";"), next));
  //     }
  //     const seatsTypeIndex = await autoIncrementNumber(TableCodeModel, 'seatsType')

  //     await TableCodeModel.create({
  //       seatsType: seatsTypeIndex,
  //       seats
  //     });

  //     handleSuccess(res, "座位人數上限設定成功", null);
  //   }),
  // deleteTableCode: handleErrorAsync(
  //   async (req: any, res: Response, next: NextFunction) => {
  //     const { seatsType } = req.params;

  //     const tableCodeObj = await TableCodeModel.findOneAndUpdate(
  //       {
  //         seatsType,
  //         isDeleted: false
  //       },
  //       {
  //         isDeleted: true,
  //         deletedAt: isoDate(),
  //       },
  //       {
  //         returnDocument: "after",
  //       }
  //     );

  //     const errorMsgArray: string[] = []

  //     if (tableCodeObj === null) {
  //       errorMsgArray.push('查無座位編號');
  //     }

  //     // 如果有錯誤訊息有返回400
  //     if (errorMsgArray.length > 0) {
  //       return next(appError(400, errorMsgArray.join(";"), next));
  //     }

  //     handleSuccess(res, "刪除成功", null);
  //   })
};

export default seats;
