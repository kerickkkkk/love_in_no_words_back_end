import appError from "../service/appError";
import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import ReservationModel, { Reservation } from "../models/reservationModel";
import handleSuccess from "../service/handleSuccess";
import { isoDate, slashDate } from "../utils/dayjs";
import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import validator from "validator";
import { Message } from "../constants/messages";
import TableManagementModel from "../models/tableManagementModel";
import TableCodeModel from "../models/tableCodeModel";
import tableManagementModel, {
  TableManagement,
} from "../models/tableManagementModel";
dayjs.extend(customParseFormat);
export const reservation = {
  // S-1-1 帶位API
  setSeats: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { tableNo, reservationDate, reservationTime } = req.body;
      const errorMsgArray: string[] = [];

      // 驗證桌號
      if (Number.isNaN(tableNo)) {
        errorMsgArray.push(Message.NEED_INPUT_TABLENO);
      }
      const tableNoInfo = await TableManagementModel.findOne({
        tableNo,
      });
      if (tableNoInfo == null) {
        errorMsgArray.push(Message.NEED_INPUT_TABLENO);
      }

      // 驗證日期格式，因為是帶位，所以日期只能是當日
      if (dayjs(reservationDate, "YYYY-MM-DD", true).isValid()) {
        if (!dayjs(reservationDate).isSame(dayjs(), "day")) {
          errorMsgArray.push(Message.SET_SEATS_ONLY_TODAY);
        }
      } else {
        errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_DATE);
      }

      // 驗證訂位時段
      if (!(reservationTime === "上午" || reservationTime === "下午")) {
        errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_TIME);
      }

      // 確認坐位是否被預約
      const isReserved = await ReservationModel.find({
        tableInofo: tableNoInfo?._id,
        reservationTime,
        reservationDate,
        isCanceled: false,
      });

      if (isReserved.length != 0) {
        errorMsgArray.push(Message.HAD_RESERVARTION);
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      await ReservationModel.create({
        tableInofo: tableNoInfo?._id,
        reservationTime,
        reservationDate,
        status: "使用中",
      });
      const reservation = {
        tableNo,
        reservationDate,
        reservationTime,
      };
      return handleSuccess(res, Message.RESULT_SUCCESS, reservation);
    }
  ),
  // S-1-2 查詢座位API
  searchSeats: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { status, reservationDate, reservationTime } = req.query;
      const errorMsgArray: string[] = [];

      // 驗證日期格式

      if (!dayjs(reservationDate, "YYYY-MM-DD", true).isValid()) {
        errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_DATE);
      }

      // 驗證訂位時段

      let isReservationTimeInput = false;
      if (reservationTime != undefined) {
        if (reservationTime === "上午" || reservationTime === "下午") {
          isReservationTimeInput = true;
        } else {
          errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_TIME);
        }
      }

      let isStatusInput = false;
      if (status != undefined) {
        if (status === "使用中" || status === "已預約") {
          isStatusInput = true;
          // 未使用不能放入預約collection查詢，因為未使用沒建資料在預約collection會查不到
        } else if (status !== "未使用") {
          errorMsgArray.push(Message.NEED_INPUT_RESERVATION_STATUS);
        }
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      // 先獲取全部桌號
      const allTables = await tableManagementModel.find({
        isDisabled: false,
        isDeleted: false,
      });

      // 確認坐位是否被預約
      const reservationData = await ReservationModel.find({
        reservationDate,
        isCanceled: false,
        ...(isStatusInput === true ? { status: status } : {}),
        ...(isReservationTimeInput === true
          ? { reservationTime: reservationTime }
          : { reservationTime: "上午" }),
      });

      // 定義返回的資料格式
      interface tablesInfo {
        tableNo: number;
        tableName: number;
        seats: number | undefined;
        isWindowSeat: boolean;
        status?: string;
        reservation?: {
          reservationId: string;
          reservationDate: Date;
          reservationTime: string;
          name: string | null;
          phone: string | null;
        };
      }

      let responseData: tablesInfo[] = [];
      // 有指定狀態查詢
      if (isStatusInput) {
        // 使用中或已預約狀態查詢
        if (status === "使用中" || status === "已預約") {
          let dataNo = 0;
          for (let tableNo = 0; tableNo < allTables.length; tableNo++) {
            for (let reserNo = 0; reserNo < reservationData.length; reserNo++) {
              if (
                reservationData[reserNo].tableInofo.tableNo ===
                allTables[tableNo].tableNo
              ) {
                responseData[dataNo] = {
                  tableNo: allTables[tableNo].tableNo,
                  tableName: allTables[tableNo].tableName,
                  seats: allTables[tableNo]?.seats,
                  isWindowSeat: allTables[tableNo].isWindowSeat,
                  status: reservationData[reserNo].status,
                  reservation: {
                    reservationId: reservationData[reserNo]._id,
                    reservationDate: reservationData[reserNo].reservationDate,
                    reservationTime: reservationData[reserNo].reservationTime,
                    name: reservationData[reserNo]?.name,
                    phone: reservationData[reserNo]?.phone,
                  },
                };
                dataNo += 1;
              }
            }
          }
        }
        // 未使用狀態查詢
      } else if (status === "未使用") {
        let needDeleteArr = [];
        // 先把預訂裡面有的tableNo對應到全部tables的數組元素抓出來
        for (let tableNo = 0; tableNo < allTables.length; tableNo++) {
          for (let reserNo = 0; reserNo < reservationData.length; reserNo++) {
            if (
              reservationData[reserNo].tableInofo.tableNo ===
              allTables[tableNo].tableNo
            ) {
              needDeleteArr.push(tableNo);
            }
          }
        }

        // 將原本的全部桌號數組扣除已經是已預約跟使用中的狀態桌號
        for (
          let deleteNo = needDeleteArr.length - 1;
          deleteNo >= 0;
          deleteNo--
        ) {
          allTables.splice(needDeleteArr[deleteNo], 1);
        }

        // 剩下的桌號為未使用，套用桌號資料並輸出
        for (let tableNo = 0; tableNo < allTables.length; tableNo++) {
          responseData[tableNo] = {
            tableNo: allTables[tableNo].tableNo,
            tableName: allTables[tableNo].tableName,
            seats: allTables[tableNo]?.seats,
            isWindowSeat: allTables[tableNo].isWindowSeat,
            status: "未使用",
          };
        }

        // 不指定狀態，全部狀態都要返回
      } else {
        // 先塞基本資訊
        for (let tableNo = 0; tableNo < allTables.length; tableNo++) {
          responseData[tableNo] = {
            tableNo: allTables[tableNo].tableNo,
            tableName: allTables[tableNo].tableName,
            seats: allTables[tableNo]?.seats,
            isWindowSeat: allTables[tableNo].isWindowSeat,
          };

          // 如果沒有預約資訊，則每項資料的狀態都是未使用
          if (reservationData.length == 0) {
            responseData[tableNo] = {
              ...responseData[tableNo],
              status: "未使用",
            };
          }

          // 如果有預約數據且桌號相同就寫入預約資訊，沒有預約數據的桌號則補未使用狀態
          for (let reserNo = 0; reserNo < reservationData.length; reserNo++) {
            if (
              reservationData[reserNo].tableInofo.tableNo ===
              allTables[tableNo].tableNo
            ) {
              responseData[tableNo] = {
                ...responseData[tableNo],
                status: reservationData[reserNo].status,
                reservation: {
                  reservationId: reservationData[reserNo]._id,
                  reservationDate: reservationData[reserNo].reservationDate,
                  reservationTime: reservationData[reserNo].reservationTime,
                  name: reservationData[reserNo]?.name,
                  phone: reservationData[reserNo]?.phone,
                },
              };
              break;
              // 補未使用狀態
            } else {
              responseData[tableNo] = {
                ...responseData[tableNo],
                status: "未使用",
              };
            }
          }
        }
      }

      return handleSuccess(res, Message.RESULT_SUCCESS, {
        tables: responseData,
      });
    }
  ),
  // S-1-3 新增訂位API
  createReservation: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { tableNo, reservationDate, reservationTime, name, phone } =
        req.body;
      const errorMsgArray: string[] = [];

      // 驗證桌號
      if (Number.isNaN(tableNo)) {
        errorMsgArray.push(Message.NEED_INPUT_TABLENO);
      }
      const tableNoInfo = await TableManagementModel.findOne({
        tableNo,
        isDisabled: false,
        isDeleted: false,
      });
      if (tableNoInfo == null) {
        errorMsgArray.push(Message.NEED_INPUT_TABLENO);
      }

      // 驗證日期格式，且日期要等於當日或新於當日
      if (dayjs(reservationDate, "YYYY-MM-DD", true).isValid()) {
        if (
          !(
            dayjs(reservationDate).isAfter(dayjs(), "day") ||
            dayjs(reservationDate).isSame(dayjs(), "day")
          )
        ) {
          errorMsgArray.push(Message.RESERVATIONDATE_NEED_NEWER_THAN_TODAY);
        }
      } else {
        errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_DATE);
      }

      // 驗證訂位時段
      if (!(reservationTime === "上午" || reservationTime === "下午")) {
        errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_TIME);
      }
      if (!name) {
        errorMsgArray.push(Message.NEED_INPUT_NAME);
      }
      if (!phone || !validator.isMobilePhone(phone, "zh-TW")) {
        errorMsgArray.push(Message.NEED_INPUT_PHONE);
      }
      // 確認坐位是否被預約
      const isReserved = await ReservationModel.find({
        tableInofo: tableNoInfo?._id,
        reservationTime,
        reservationDate,
        isCanceled: false,
      });

      if (isReserved.length != 0) {
        errorMsgArray.push(Message.HAD_RESERVARTION);
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      await ReservationModel.create({
        tableInofo: tableNoInfo?._id,
        name,
        phone,
        reservationTime,
        reservationDate,
        status: "已預約",
      });
      const reservation = {
        tableNo,
        seats: tableNoInfo?.seats,
        reservationDate,
        reservationTime,
        name,
        phone,
      };
      return handleSuccess(res, Message.RESULT_SUCCESS, reservation);
    }
  ),
  // S-1-4 修改訂位API
  reviseReservation: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { reservationId } = req.params;
      const { reservationDate, reservationTime, name, phone, status } =
        req.body;
      const errorMsgArray: string[] = [];

      let reservationInfo: Reservation | null = null;
      try {
        reservationInfo = await ReservationModel.findById(reservationId)
          .where("isCanceled")
          .ne(true);
        // 如果找不到資料
        if (reservationInfo == null) {
          return next(appError(400, Message.RESERVATION_ID_NOT_FOUND, next));
        }
      } catch (err) {
        // 當request有傳reservationId，但是位數不夠或過長，mongoose不能轉換成有效id時
        if (err instanceof mongoose.Error.CastError) {
          return next(appError(400, Message.RESERVATION_ID_NOT_FOUND, next));
        }
      }

      // 驗證日期格式，且日期要等於當日或新於當日
      if (dayjs(reservationDate, "YYYY-MM-DD", true).isValid()) {
        if (
          !(
            dayjs(reservationDate).isAfter(dayjs(), "day") ||
            dayjs(reservationDate).isSame(dayjs(), "day")
          )
        ) {
          errorMsgArray.push(Message.RESERVATIONDATE_NEED_NEWER_THAN_TODAY);
        }
      } else {
        errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_DATE);
      }

      // 驗證訂位時段
      if (!(reservationTime === "上午" || reservationTime === "下午")) {
        errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_TIME);
      }
      if (!name) {
        errorMsgArray.push(Message.NEED_INPUT_NAME);
      }
      if (!phone || !validator.isMobilePhone(phone, "zh-TW")) {
        errorMsgArray.push(Message.NEED_INPUT_PHONE);
      }

      if (!(status === "使用中" || status === "已預約")) {
        errorMsgArray.push(Message.NEED_INPUT_RESERVATION_STATUS);
      }
      // 確認座位是否被預約
      const isReserved = await ReservationModel.find({
        tableInofo: reservationInfo?.tableInofo?._id,
        reservationTime,
        reservationDate,
        isCanceled: false,
      });

      if (
        isReserved.length != 0 &&
        reservationId != isReserved[0]?._id.toString()
      ) {
        errorMsgArray.push(Message.HAD_RESERVARTION);
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      // 更新預訂內容
      await ReservationModel.findByIdAndUpdate(reservationId, {
        name,
        phone,
        reservationTime,
        reservationDate,
        status,
        revisedAt: isoDate(),
      });
      // 返回內容
      const reservation = {
        tableNo: reservationInfo?.tableInofo?.tableNo,
        seats: reservationInfo?.tableInofo?.seats,
        reservationDate,
        reservationTime,
        name,
        phone,
      };
      return handleSuccess(res, Message.RESULT_SUCCESS, reservation);
    }
  ),

  // S-1-5 取消訂位API
  softDeleteReservation: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { reservationId } = req.params;

      try {
        const getResult = await ReservationModel.findByIdAndUpdate(
          reservationId,
          {
            isCanceled: true,
            canceledAt: isoDate(),
          }
        )
          .where("isCanceled")
          .ne(true);
        // 如果找不到資料
        if (getResult == null) {
          return next(appError(400, Message.RESERVATION_ID_NOT_FOUND, next));
        }
      } catch (err) {
        // 當request有傳reservationId，但是位數不夠或過長，mongoose不能轉換成有效id時
        if (err instanceof mongoose.Error.CastError) {
          return next(appError(400, Message.RESERVATION_ID_NOT_FOUND, next));
        }
      }

      handleSuccess(res, Message.RESERVATION_CANCEL_SUCCESS, null);
    }
  ),
};

export default reservation;
