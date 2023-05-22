import { Request, Response, NextFunction } from "express";
import dayjs, { combinedDateTimeString } from "../utils/dayjs";
import validator from "validator";
import XLSX from "xlsx";
import nodemailer from "nodemailer";
import handleErrorAsync from "../service/handleErrorAsync";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import OrderModel from "../models/orderModel";
import { User } from "../models/userModel";
import { Meta } from "../types/Pagination";
import { Message } from "../constants/messages";
import { isEffectVal } from "../utils/common";
import fs from "fs";
import * as path from "path";
import firebaseAdmin from "../service/firebase";
import { v4 as uuidv4 } from "uuid";
import { GetSignedUrlConfig } from "@google-cloud/storage";
interface RequestQuery {
  year?: number;
  month?: number;
  number?: number;
  page?: number;
}

const getRevenueData = async (year: number) => {
  const orders = await OrderModel.find({
    orderStatus: "已結帳",
    isDeleted: false,
    createdAt: {
      $gte: new Date(`${year}-01-01T00:00:00.000Z`),
      $lte: new Date(`${year}-12-31T23:59:59.999Z`),
    },
  })
    .populate({
      path: "orderDetail",
      select: "totalPrice",
    })
    .sort({ createdAt: 1 });

  const tempData = orders.reduce((prev: any, next: any) => {
    const currentMonth = dayjs(next.createdAt).month() + 1;
    if (prev[currentMonth] === undefined) {
      prev[currentMonth] = 0;
    }
    prev[currentMonth] += next.orderDetail.totalPrice;
    return prev;
  }, {});
  const data = Object.entries(tempData).map((item) => {
    return {
      month: Number(item[0]),
      monthTotal: item[1],
    };
  });
  return data;
};

const getSellQuantityData = async (year: number) => {
  const orders = await OrderModel.find({
    orderStatus: "已結帳",
    isDeleted: false,
    createdAt: {
      $gte: new Date(`${year}-01-01T00:00:00.000Z`),
      $lte: new Date(`${year}-12-31T23:59:59.999Z`),
    },
  })
    .populate({
      path: "orderDetail",
      select: "orderList",
    })
    .sort({ createdAt: 1 });

  const tempData = orders.reduce((prev: any, next: any) => {
    next.orderDetail.orderList.forEach((orderItem: any) => {
      if (prev[orderItem.productNo] === undefined) {
        prev[orderItem.productNo] = {
          productNo: orderItem.productNo,
          productName: orderItem.productName,
          amount: 0,
        };
      }
      prev[orderItem.productNo].amount += orderItem.qty;
    });
    return prev;
  }, {});
  const data = Object.values(tempData);
  return data;
};

const getOrderQuantityData = async (year: number) => {
  const orders = await OrderModel.find({
    orderStatus: "已結帳",
    isDeleted: false,
    createdAt: {
      $gte: new Date(`${year}-01-01T00:00:00.000Z`),
      $lte: new Date(`${year}-12-31T23:59:59.999Z`),
    },
  }).sort({ createdAt: 1 });

  const tempData = orders.reduce((prev: any, next: any) => {
    const currentMonth = dayjs(next.createdAt).month() + 1;
    if (prev[currentMonth] === undefined) {
      prev[currentMonth] = 0;
    }
    prev[currentMonth] += 1;
    return prev;
  }, {});

  const data = Object.entries(tempData).map((item) => {
    return {
      month: Number(item[0]),
      orderNumber: item[1],
    };
  });
  return data;
};
export const report = {
  // O-5-1 獲取賣出數量資料
  getRevenue: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const year = req.query.year || dayjs().year();
      const data = await getRevenueData(year);

      handleSuccess(res, "成功", data);
    }
  ),
  // O-5-2 獲取賣出數量資料
  getSellQuantity: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 預設獲取當年度
      const year = req.query.year || dayjs().year();
      const data = await getSellQuantityData(year);
      handleSuccess(res, "成功", data);
    }
  ),
  // O-5-3 獲取訂單數量資料
  getOrderQuantity: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 預設獲取當年度
      const year = req.query.year || dayjs().year();
      const data = await getOrderQuantityData(year);
      handleSuccess(res, "成功", data);
    }
  ),

  // O-5-4 寄送報表
  sendReport: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const reportType = Number(req.params.reportType);
      const { email } = req.query;
      if (
        reportType &&
        !validator.isInt(reportType?.toString(), { min: 1, max: 3 })
      ) {
        return next(appError(400, "無該報表種類", next));
      }

      // 符合店長的 email 未刪除，未停用
      const ownersObj = await User.find({
        titleNo: 1,
        isDisabled: false,
        isDeleted: false,
      });

      if (ownersObj === null) {
        return next(appError(400, "查無店長，請新增店長。", next));
      }

      if (email) {
        // 暫時先用傳入
        if (!validator.isEmail(email)) {
          return next(appError(400, "請輸入正確的信箱格式", next));
        }
      } else {
        // 收集 email 驗證失敗的身份
        const noPassList = ownersObj
          .filter((user) => !user.email || !validator.isEmail(user.email))
          ?.reduce((acc, cur) => {
            acc.push(cur.number);
            return acc;
          }, [] as any)
          .join(";");

        if (noPassList !== "") {
          return next(appError(400, `編號: ${noPassList};信箱有誤。`, next));
        }
      }

      // 預設獲取當年度
      const year = req.query.year || dayjs().year();
      let data = null;
      switch (reportType) {
        case 1:
          data = await getRevenueData(year);
          break;
        case 2:
          data = await getSellQuantityData(year);
          break;
        case 3:
          data = await getOrderQuantityData(year);
          break;
        default:
          return next(appError(400, "無該報表種類", next));
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      // 設定表頭
      let sheetType = "";
      switch (reportType) {
        case 1:
          worksheet["A1"] = { t: "s", v: "月" };
          worksheet["B1"] = { t: "s", v: "月營收" };
          sheetType = "營收資料";
          break;
        case 2:
          worksheet["A1"] = { t: "s", v: "產品編碼" };
          worksheet["B1"] = { t: "s", v: "產品名稱" };
          worksheet["C1"] = { t: "s", v: "數量" };
          sheetType = "賣出數量";
          break;
        case 3:
          worksheet["A1"] = { t: "s", v: "月" };
          worksheet["B1"] = { t: "s", v: "訂單數" };
          sheetType = "訂單筆數";
          break;
        default:
          return next(appError(400, "請輸入正確的報表編號", next));
      }

      // convert worksheet to workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${sheetType}`);

      // 本地可以打開看寫入本地
      // XLSX.writeFile(workbook, `${sheetType}-${combinedDateTimeString()}.xlsx`);

      const buffer = XLSX.write(workbook, { type: "buffer" });

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          type: "OAuth2",
          user: process.env.ACCOUNT,
          clientId: process.env.CLINENTID,
          clientSecret: process.env.CLINENTSECRET,
          refreshToken: process.env.REFRESHTOKEN,
          accessToken: process.env.ACCESSTOKEN,
        },
      });
      let sendEmail = "";
      if (email) {
        sendEmail = email;
      } else {
        sendEmail = ownersObj
          .reduce((acc, cur) => {
            acc.push(cur.email);
            return acc;
          }, [] as any)
          .join(", ");
      }
      // 送完後沒有被捕捉 在寫一層
      try {
        await transporter.sendMail({
          from: `傲嬌甜點 POS 系統<${process.env.ACCOUNT}>`,
          to: `${sendEmail}`,
          subject: `${sheetType}`,
          text: "報表",
          html: `
          <!DOCTYPE html>
            <html>
            <head>
              <style>
                /* 添加樣式以提高電子郵件的外觀 */
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                }
                .header {
                  background-color: #f5f5f5;
                  padding: 20px;
                }
                .content {
                  padding: 20px;
                }
                .footer {
                  background-color: #f5f5f5;
                  padding: 20px;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>傲嬌甜點電商 - 報表</h2>
              </div>
              
              <div class="content">
                <p>親愛的客戶，</p>
                
                <p>以下是傲嬌甜點電商的最新報表：</p>
                
                <b>${sheetType}-${combinedDateTimeString()}.xlsx</b>
                <p>感謝您對我們甜點電商的支持！如有任何問題或需要進一步的資訊，請隨時聯繫我們。</p>
                
                <p>謹上</p>
                <p>傲嬌甜點電商團隊</p>
              </div>
              
              <div class="footer">
                <p>如需協助，請聯繫我們：<br>
                電子郵件：loveinnowords@gmail.com<br>
                電話：123-456-7890</p>
              </div>
            </body>
            </html>
          `,
          attachments: [
            {
              filename: `${sheetType}-${combinedDateTimeString()}.xlsx`,
              content: buffer,
            },
          ],
        });
        return handleSuccess(res, "報表寄送成功", null);
      } catch (error) {
        return next(appError(400, "寄送失敗，請確定信箱是否正確", next));
      }
    }
  ),

  // O-5-5 條件搜尋訂單資訊
  getOrderInformation: handleErrorAsync(
    async (
      req: Request<any, any, any, RequestQuery>,
      res: Response,
      next: NextFunction
    ) => {
      const { query } = req;
      const year = Number(query.year) || dayjs().year();
      const month = Number(query.month) || dayjs().month() + 1;
      const perPage = Number(query.number) || 50;
      const currentPage = Number(query.page) || 1;

      // 使用 dayjs 建立起始日期和結束日期物件
      const startOfMonth = dayjs(`${year}-${month}-01`).toDate(); // 設定月初日期
      const endOfMonth = dayjs(`${year}-${month}-01`).endOf("month").toDate(); // 設定月底日期
      // isInt 第一個參數要字串
      if (perPage && !validator.isInt(perPage?.toString(), { min: 1 })) {
        return next(appError(400, "單頁筆數請以正整數輸入", next));
      }

      if (!dayjs(startOfMonth).isValid() || !dayjs(endOfMonth).isValid()) {
        return next(appError(400, "日期格式錯誤", next));
      }

      if (month && !validator.isInt(month?.toString(), { min: 1, max: 12 })) {
        return next(appError(400, "月份請輸入 1 ~ 12 月", next));
      }

      const skip = (currentPage - 1) * perPage;

      const [total, orders] = await Promise.all([
        OrderModel.countDocuments({
          orderStatus: "已結帳",
          isDeleted: false,
          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        }),
        OrderModel.aggregate([
          {
            $match: {
              orderStatus: "已結帳",
              isDeleted: false,
              createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth,
              },
            },
          },
          {
            $skip: skip,
          },
          {
            $limit: perPage,
          },
          {
            $lookup: {
              from: "orderDetail",
              localField: "orderDetail",
              foreignField: "_id",
              as: "orderDetail",
            },
          },
          {
            $unwind: "$orderDetail",
          },
          {
            $addFields: {
              createdAtFormatted: {
                $dateToString: {
                  format: "%Y-%m-%d %H:%M:%S",
                  date: "$createdAt",
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              orderNo: 1,
              createdAt: "$createdAtFormatted",
              totalPrice: "$orderDetail.totalPrice",
            },
          },
          {
            $sort: { createdAt: 1 },
          },
        ]),
      ]);

      if (total > 0) {
        const lastPage = Math.ceil(total / perPage);
        const nextPage = currentPage == lastPage ? null : currentPage + 1;
        const prevPage = currentPage == 1 ? null : currentPage - 1;
        const from = (currentPage - 1) * 10 + 1;
        const to =
          currentPage * perPage > total ? total : currentPage * perPage;

        if (lastPage < currentPage) {
          return next(appError(400, "超出分頁上限", next));
        }

        const meta: Meta = {
          pagination: {
            total,
            perPage,
            currentPage,
            lastPage,
            nextPage,
            prevPage,
            from,
            to,
          },
        };
        return handleSuccess(res, "成功", {
          data: orders,
          meta,
        });
      } else {
        return next(appError(400, "無該月份資料", next));
      }
    }
  ),
  // O-5-6 訂單資訊下載API
  downloadReports: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      let { month, dataAmount } = req.query;
      const errorMsgArray = [];
      if (!isEffectVal(month) || Number.isNaN(Number(month))) {
        errorMsgArray.push(Message.NEED_POSITIVE_PAGE);
      }
      if (!isEffectVal(dataAmount) || Number.isNaN(Number(dataAmount))) {
        errorMsgArray.push(Message.MONTH_DATA_NOT_FOUND);
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      // 生成Excel文件
      const startOfMonth = dayjs(
        `${dayjs().year()}-${Number(month)}-01`
      ).toDate(); // 設定月初日期
      const endOfMonth = dayjs(`${dayjs().year()}-${Number(month)}-01`)
        .endOf("month")
        .toDate(); // 設定月底日期

      const workbook = XLSX.utils.book_new();
      const orders = await OrderModel.aggregate([
        {
          $match: {
            orderStatus: "已結帳",
            isDeleted: false,
            createdAt: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          },
        },

        {
          $limit: Number(dataAmount),
        },
        {
          $lookup: {
            from: "orderDetail",
            localField: "orderDetail",
            foreignField: "_id",
            as: "orderDetail",
          },
        },
        {
          $unwind: "$orderDetail",
        },
        {
          $addFields: {
            createdAtFormatted: {
              $dateToString: {
                format: "%Y-%m-%d %H:%M:%S",
                date: "$createdAt",
                timezone: "+08:00",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            orderNo: 1,
            totalPrice: "$orderDetail.totalPrice",
            createdAt: "$createdAtFormatted",
          },
        },
        {
          $sort: { createdAt: 1 },
        },
      ]);
      // 增加項次
      const data = orders.map((element, index) => {
        const itemNo = index + 1;
        return { itemNo, ...element };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);

      var wscols = [{ wch: 6 }, { wch: 15 }, { wch: 10 }, { wch: 20 }];

      worksheet["!cols"] = wscols;

      worksheet["A1"] = { t: "s", v: "項次" };
      worksheet["B1"] = { t: "s", v: "訂單編號" };
      worksheet["C1"] = { t: "s", v: "價錢" };
      worksheet["D1"] = { t: "s", v: "時間" };

      XLSX.utils.book_append_sheet(workbook, worksheet, "營收資料");
      // 儲存在本地方法
      const fileName = dayjs().format("YYYY年") + month + "月營收報表.xlsx";

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      // 將Excel文件作為附件下載
      const encodedFileName = encodeURIComponent(fileName);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8\'\'${encodedFileName}`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(buffer);
      // 要用URL打打看 postman會不能改名稱
      // http://localhost:3000/v1/reports/admin/orders/download?month=6&dataAmount=100
      // 以下sendFile方法只能用在儲存在本地的檔案夾的時候
      // res.sendFile(path.join(__dirname, "..", "temp", fileName), (err) => {
      //   if (err) {
      //     return next(appError(400, Message.FILE_DOWNLOAD_FAIL, next));
      //   }
      //   // 下載完成後刪除Excel文件
      //   fs.unlinkSync(path.join(__dirname, "..", "temp", fileName));
      // });
      // res.sendFile(buffer, (err) => {
      //   if (err) {
      //     return next(appError(400, Message.FILE_DOWNLOAD_FAIL, next));
      //   }
      //   // 下載完成後刪除Excel文件
      //   fs.unlinkSync(path.join(__dirname, "..", "temp", fileName));
      // });

      // 以下是把檔案放到firebase的方法
      // const excelData = XLSX.write(workbook, {
      //   type: "buffer",
      //   bookType: "xlsx",
      // });

      // // 上傳 Excel 檔案到 Firebase 雲端儲存體
      // const bucket = firebaseAdmin.storage().bucket();
      // const filename = "orderReport_" + dayjs().format("YYYY-MM-DD");
      // // 檔案路徑
      // const filePath = `reports/${filename}.xlsx`;
      // const file = bucket.file(filePath);

      // file
      //   .save(excelData, {
      //     contentType:
      //       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      //   })
      //   .then(() => {
      //     console.log("Excel 檔案上傳成功");
      //   })
      //   .catch((error) => {
      //     console.error("上傳失敗:", error);
      //   });

      // // 取得具有限時有效性的下載網址
      // const options = {
      //   action: "read",
      //   expires: Date.now() + 24 * 60 * 60 * 1000, // 有效期限，此處為一天
      // };
      // let downloadUrl: string = "";
      // await bucket
      //   .file(filePath)
      //   .getSignedUrl(options as GetSignedUrlConfig)
      //   .then((urls) => {
      //     downloadUrl = urls[0];
      //   })
      //   .catch((error) => {
      //     console.error("獲取下載網址失敗:", error);
      //   });

      // handleSuccess(res, "成功", { reportUrl: downloadUrl });
    }
  ),
};

export default report;
