import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import { autoIncrementNumber } from "../utils/modelsExtensions";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import TableManagementModel from "../models/tableManagementModel";
import TableCodeModel from "../models/tableCodeModel";
import { isoDate } from "../utils/dayjs";
import { Message } from "../constants/messages";

export const seats = {
  getSeats: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 全部都要看的到 只是有停用
      const seats = await TableManagementModel.find().populate({
        path: 'tableCode',
        select: "seatsType seats"
      }).sort({ tableNo: 1 });
      handleSuccess(res, "成功", seats);
    }
  ),
  // 座位
  // 簡易的處理
  createSeat: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { tableNo, tableName, seatsType, isWindowSeat = false, isDisabled = false } = req.body;

      const tableManagementObj = await TableManagementModel.findOne({ tableNo })
      if (tableManagementObj !== null) {
        return next(appError(400, '重複桌號', next));
      }

      const errorMsgArray: string[] = []
      if (!tableNo || !tableName) {
        errorMsgArray.push('請給座位資訊');
      }

      if (!seats) {
        errorMsgArray.push('座位不得為空');
      }

      if (typeof isDisabled !== 'boolean') {
        errorMsgArray.push('啟用狀態有誤');
      }

      const tableCodeObj = await TableCodeModel.findOne({ seatsType, isDeleted: false })
      if (tableCodeObj === null) {
        errorMsgArray.push('無此座位類型')
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const newSeat = await TableManagementModel.create({
        tableNo,
        tableName,
        tableCode: tableCodeObj?._id,
        isWindowSeat,
        isDisabled
      });
      return handleSuccess(res, Message.RESULT_SUCCESS, newSeat);
    }
  ),
  patchSeat: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { tableNo } = req.params;
      const { seatsType, isWindowSeat = false, isDisabled = false } = req.body
      const errorMsgArray: string[] = []

      if (!tableNo) {
        errorMsgArray.push('桌號資訊為空');
      }

      if (!seatsType) {
        errorMsgArray.push('請選擇座位類型');
      }

      const tableCodeObj = await TableCodeModel.findOne({ seatsType, isDeleted: false })
      if (tableCodeObj === null) {
        errorMsgArray.push('無此座位類型');
      }

      if (typeof isDisabled !== 'boolean') {
        errorMsgArray.push('啟用狀態有誤');
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
          tableCode: tableCodeObj?._id,
          isWindowSeat,
          isDisabled
        },
        {
          returnDocument: "after",
        }
      );
      if (updatedSeat === null) {
        errorMsgArray.push('查無桌號');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      return handleSuccess(res, "座位修改成功", null);
    }
  ),
  softDeleteSeat: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { tableNo } = req.params;

      const errorMsgArray: string[] = []

      if (!tableNo) {
        errorMsgArray.push('桌號資訊為空');
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
          isDisabled: true
        },
        {
          returnDocument: "after",
        }
      );
      if (updatedSeat === null) {
        errorMsgArray.push('查無桌號');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      return handleSuccess(res, Message.RESULT_SUCCESS, updatedSeat);
    }
  ),
  // 取得座位人數上限
  getTableCode: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const seats = await TableCodeModel.find({ isDeleted: false }).sort({ seats: 1 });
      console.log({ seats })
      handleSuccess(res, "成功", seats);
    }),
  createTableCode: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { seats } = req.body;

      const errorMsgArray: string[] = []

      if (!seats) {
        errorMsgArray.push('座位不得為空');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      const seatsTypeIndex = await autoIncrementNumber(TableCodeModel, 'seatsType')

      const newSeat = await TableCodeModel.create({
        seatsType: seatsTypeIndex,
        seats
      });

      handleSuccess(res, "成功", newSeat);
    }),
  deleteTableCode: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { seatsType } = req.params;

      const tableCodeObj = await TableCodeModel.findOneAndUpdate(
        {
          seatsType,
          isDisabled: false
        },
        {
          isDisabled: true,
          deletedAt: isoDate(),
        },
        {
          returnDocument: "after",
        }
      );

      const errorMsgArray: string[] = []

      if (tableCodeObj === null) {
        errorMsgArray.push('查無座位編號');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      handleSuccess(res, "刪除成功", null);
    })
};

export default seats;
