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
import ExcelJS from "exceljs";
import { setCache } from "../connection/service/redis";
import ImageCharts from "image-charts";
import Jimp from "jimp";
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
      setCache(req.originalUrl, data);
      handleSuccess(res, "成功", data);
    }
  ),
  // O-5-2 獲取賣出數量資料
  getSellQuantity: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 預設獲取當年度
      const year = req.query.year || dayjs().year();
      const data = await getSellQuantityData(year);
      setCache(req.originalUrl, data);
      handleSuccess(res, "成功", data);
    }
  ),
  // O-5-3 獲取訂單數量資料
  getOrderQuantity: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 預設獲取當年度
      const year = req.query.year || dayjs().year();
      const data = await getOrderQuantityData(year);
      setCache(req.originalUrl, data);
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
        setCache(req.originalUrl, {
          data: orders,
          meta,
        });
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
      try {
        // 生成Excel文件
        const startOfMonth = dayjs(
          `${dayjs().year()}-${Number(month)}-01`
        ).toDate(); // 設定月初日期
        const endOfMonth = dayjs(`${dayjs().year()}-${Number(month)}-01`)
          .endOf("month")
          .toDate(); // 設定月底日期

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

        const dailySell = orders.reduce((prev: any, next: any) => {
          const currentDate = dayjs(next.createdAt).date();
          // 如果沒有該日期資料就新增一個
          if (
            prev[0] === undefined ||
            prev[prev.length - 1][0] != currentDate
          ) {
            prev[prev.length] = [currentDate, next.totalPrice];
          } else {
            // 日期一樣就將金額累加
            prev[prev.length - 1] = [
              currentDate,
              Number(next.totalPrice) + Number(prev[prev.length - 1][1]),
            ];
          }
          return prev;
        }, []);

        // 增加項次
        const dataArray = orders.map((element, index) => {
          const itemNo = index + 1;
          return { itemNo, ...element };
        });

        // 檔案名稱
        const fileName = dayjs().format("YYYY年") + month + "月營收報表.xlsx";

        const workbook = new ExcelJS.Workbook();

        // 創建一個新的工作表
        const worksheet = workbook.addWorksheet("營收資料");

        worksheet.views = [
          {
            showGridLines: false,
          },
        ];
        // 設定欄寬
        worksheet.getColumn("A").width = 6;
        worksheet.getColumn("B").width = 15;
        worksheet.getColumn("C").width = 10;
        worksheet.getColumn("D").width = 20;
        worksheet.getColumn("F").width = 6;
        worksheet.getColumn("G").width = 20;

        // 文件設置
        workbook.creator = "love_in_no_words_POS_System";
        workbook.created = new Date();

        // 通過文件名將圖像添加到工作簿
        const imageId1 = workbook.addImage({
          filename: "./assets/img/LOGO.png",
          extension: "png",
        });
        // // 在 A1上插入ICON圖片
        worksheet.getRow(1).height = 32;
        worksheet.addImage(imageId1, "A1:A1");

        // POS系統名稱欄位合併為單一儲存格
        worksheet.mergeCells("B1:D1");
        worksheet.getCell("B1").value = `傲嬌甜點 POS 點餐系統${month}月報表`;
        worksheet.getCell("B1").alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        worksheet.getCell("B1").font = {
          size: 14,
          bold: true,
        };
        // 寫入標題行
        worksheet.getCell("A2").value = "項次";
        // 設定框線式樣
        worksheet.getCell("A2").border = {
          top: { style: "double", color: { argb: "FF00FF00" } },
          left: { style: "double", color: { argb: "FF00FF00" } },
          bottom: { style: "double", color: { argb: "FF00FF00" } },
          right: { style: "thin", color: { argb: "FF00FF00" } },
        };
        worksheet.getCell("A2").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "335AA2AE" },
        };
        worksheet.getCell("B2").value = "訂單編號";
        worksheet.getCell("B2").border = {
          top: { style: "double", color: { argb: "FF00FF00" } },
          left: { style: "thin", color: { argb: "FF00FF00" } },
          bottom: { style: "double", color: { argb: "FF00FF00" } },
          right: { style: "thin", color: { argb: "FF00FF00" } },
        };
        worksheet.getCell("B2").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "335AA2AE" },
        };
        worksheet.getCell("C2").value = "金額(元)";
        worksheet.getCell("C2").border = {
          top: { style: "double", color: { argb: "FF00FF00" } },
          left: { style: "thin", color: { argb: "FF00FF00" } },
          bottom: { style: "double", color: { argb: "FF00FF00" } },
          right: { style: "thin", color: { argb: "FF00FF00" } },
        };
        worksheet.getCell("C2").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "335AA2AE" },
        };
        worksheet.getCell("D2").value = "時間";
        worksheet.getCell("D2").border = {
          top: { style: "double", color: { argb: "FF00FF00" } },
          left: { style: "thin", color: { argb: "FF00FF00" } },
          bottom: { style: "double", color: { argb: "FF00FF00" } },
          right: { style: "double", color: { argb: "FF00FF00" } },
        };
        worksheet.getCell("D2").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "335AA2AE" },
        };
        worksheet.getCell("F2").value = "日期";
        worksheet.getCell("F2").border = {
          top: { style: "double", color: { argb: "FF00FF00" } },
          left: { style: "double", color: { argb: "FF00FF00" } },
          bottom: { style: "double", color: { argb: "FF00FF00" } },
          right: { style: "thin", color: { argb: "FF00FF00" } },
        };
        worksheet.getCell("F2").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "335AA2AE" },
        };
        worksheet.getCell("G2").value = "單日營業額(元)";
        worksheet.getCell("G2").border = {
          top: { style: "double", color: { argb: "FF00FF00" } },
          left: { style: "thin", color: { argb: "FF00FF00" } },
          bottom: { style: "double", color: { argb: "FF00FF00" } },
          right: { style: "double", color: { argb: "FF00FF00" } },
        };
        worksheet.getCell("G2").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "335AA2AE" },
        };
        worksheet.getRow(2).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        worksheet.getRow(2).font = {
          size: 12,
          bold: true,
        };

        // 寫入每筆資料
        dataArray.forEach((data, index) => {
          const row = worksheet.getRow(index + 3); // 從第3行開始寫入數據
          if (index % 2 === 1) {
            row.getCell("A").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDAEEF3" },
            };
            row.getCell("B").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDAEEF3" },
            };
            row.getCell("C").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDAEEF3" },
            };
            row.getCell("D").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDAEEF3" },
            };
          }
          row.getCell("A").value = data.itemNo;
          row.getCell("A").border = {
            left: { style: "double", color: { argb: "FF00FF00" } },
            bottom: { style: "thin", color: { argb: "FF00FF00" } },
            right: { style: "thin", color: { argb: "FF00FF00" } },
          };
          row.getCell("B").value = data.orderNo;
          row.getCell("B").border = {
            bottom: { style: "thin", color: { argb: "FF00FF00" } },
            right: { style: "thin", color: { argb: "FF00FF00" } },
          };
          row.getCell("C").value = data.totalPrice;
          row.getCell("C").border = {
            bottom: { style: "thin", color: { argb: "FF00FF00" } },
            right: { style: "thin", color: { argb: "FF00FF00" } },
          };
          row.getCell("D").value = data.createdAt;
          row.getCell("D").border = {
            bottom: { style: "thin", color: { argb: "FF00FF00" } },
            right: { style: "double", color: { argb: "FF00FF00" } },
          };

          if (index === dataArray.length - 1) {
            // 最後一行設定為總營業額
            const lastLow = worksheet.getRow(index + 4);
            // 總營業額部分合併為單一儲存格
            worksheet.mergeCells(`A${index + 4}:B${index + 4}`);
            worksheet.mergeCells(`C${index + 4}:D${index + 4}`);

            //  設定總結公式
            worksheet.getCell(`C${index + 4}`).value = {
              formula: `=SUM(C3:C${index + 3})`,
              result: 0,
              date1904: false,
            };
            lastLow.getCell("A").value = "營業額總計(元)：";
            lastLow.getCell("A").border = {
              left: { style: "double", color: { argb: "FF00FF00" } },
              bottom: { style: "double", color: { argb: "FF00FF00" } },
              right: { style: "thin", color: { argb: "FF00FF00" } },
            };
            lastLow.getCell("C").border = {
              bottom: { style: "double", color: { argb: "FF00FF00" } },
              right: { style: "double", color: { argb: "FF00FF00" } },
            };
          }
        });

        // 設定圖片所需字串
        let dailySellString = "a:";
        let dailySellxLabel = "0:|";
        // 每日營業額累計
        dailySell.forEach((data: any, index: any) => {
          const row = worksheet.getRow(index + 3); // 從第2行開始寫入數據
          if (index % 2 === 1) {
            row.getCell("F").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDAEEF3" },
            };
            row.getCell("G").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDAEEF3" },
            };
          }
          row.getCell("F").value = data[0];
          row.getCell("F").border = {
            left: { style: "double", color: { argb: "FF00FF00" } },
            bottom: { style: "thin", color: { argb: "FF00FF00" } },
            right: { style: "thin", color: { argb: "FF00FF00" } },
          };

          row.getCell("G").value = data[1];
          row.getCell("G").border = {
            bottom: { style: "thin", color: { argb: "FF00FF00" } },
            right: { style: "double", color: { argb: "FF00FF00" } },
          };
          // 最後一筆的外框線為雙框線式樣
          if (index === dailySell.length - 1) {
            row.getCell("F").border = {
              left: { style: "double", color: { argb: "FF00FF00" } },
              bottom: { style: "double", color: { argb: "FF00FF00" } },
              right: { style: "thin", color: { argb: "FF00FF00" } },
            };
            row.getCell("G").border = {
              bottom: { style: "double", color: { argb: "FF00FF00" } },
              right: { style: "double", color: { argb: "FF00FF00" } },
            };
            dailySellxLabel = dailySellxLabel + data[0];
            dailySellString = dailySellString + data[1];
          } else {
            dailySellxLabel = dailySellxLabel + data[0] + "|";
            dailySellString = dailySellString + data[1] + ",";
          }
        });

        // 繪製每日營業額直方圖
        const barChart = new ImageCharts()
          .chtt("單日營業額圖")
          .chts("000000,24")
          .cht("bvg")
          .chxt("x,y")
          .chbr("5")
          .chdl("單日營業額(元)")
          .chd(dailySellString)
          .chxl(dailySellxLabel)
          .chf("b0,lg,0,5AA2AE,0.8,5AA2AE,0.8")
          .chdls("000000,12")
          .chg("0,1")
          .chs("700x300");
        const uri = await barChart.toDataURI();

        // 把原圖右上角的image-charts.com文字用白色置換
        await Jimp.read(Buffer.from(uri.split(",")[1], "base64")).then(
          (image) => {
            // 取得圖片的寬度和高度
            const width = image.getWidth();

            // 要覆蓋的區域寬度和高度
            const overlayWidth = 90;
            const overlayHeight = 20;

            // 要覆蓋的區域起始點坐標 (右上角)
            const overlayX = width - overlayWidth;
            const overlayY = 0;

            // 將區域設為白色
            for (let x = overlayX; x < width; x++) {
              for (let y = overlayY; y < overlayY + overlayHeight; y++) {
                image.setPixelColor(Jimp.cssColorToHex("#FFFFFF"), x, y);
              }
            }

            // 將圖片轉換為 base64
            image.getBase64Async(Jimp.AUTO).then((base64Result) => {
              const imageId2 = workbook.addImage({
                base64: base64Result,
                extension: "png",
              });

              worksheet.addImage(imageId2, {
                tl: { col: 8, row: 3 }, // 指定插入圖片的起始位置
                ext: { width: 700, height: 300 },
                editAs: "absolute", // 將圖片位置設置為絕對值
              });
            });
          }
        );

        const buffer = await workbook.xlsx.writeBuffer();

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
      } catch (error) {
        return next(appError(400, Message.FILE_DOWNLOAD_FAIL, next));
      }
    }
  ),
};

export default report;
