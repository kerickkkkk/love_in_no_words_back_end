import appError from "../service/appError";
import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import Reservation from "../models/reservationModel";
import handleSuccess from "../service/handleSuccess";
import { isoDate, slashDate } from "../utils/dayjs";
import dayjs from "dayjs";
import validator from "validator";
import { Message } from "../constants/messages";
import TableManagementModel from "../models/tableManagementModel";
import TableCodeModel from "../models/tableCodeModel";
import { TableManagement } from "../models/tableManagementModel";

export const reservation = {
  // S-1-3 新增訂位API
  createReservation: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 只需要給 tableName 其他是預設
      const { tableNo, reservationDate, reservationTime, name, phone, status } =
        req.body;
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

      // 驗證日期格式，且日期要等於當日或新於當日(dayjs不能判斷日期有效性所以搭配validator)
      if (
        dayjs(reservationDate, "YYYY-MM-DD", true).isValid() &&
        validator.isISO8601(reservationDate, { strict: true })
      ) {
        if (
          !(
            dayjs(reservationDate).isAfter(dayjs(), "day") ||
            dayjs(reservationDate).isSame(dayjs(), "day")
          )
        ) {
          errorMsgArray.push(Message.NEED_CORRECT_RESERVATION_DATE);
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

      // 確認坐位是否被預約
      const isReserved = await Reservation.find({
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

      await Reservation.create({
        tableInofo: tableNoInfo?._id,
        name,
        phone,
        reservationTime,
        reservationDate,
        status: "已預約",
        isCanceled: false,
      });
      const reservation = {
        tableNo,
        // 保留座位功能 改成直接寫入 seats 座位人數上限 
        // 註解掉 tableCode 會有錯誤先註解掉
        // seatsType: tableNoInfo?.tableCode?.seatsType,
        reservationDate,
        reservationTime,
        name,
        phone,
      };
      return handleSuccess(res, Message.RESULT_SUCCESS, reservation);
    }
  ),
};

export default reservation;
