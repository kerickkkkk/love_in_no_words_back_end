import dayjs from "dayjs";
import isLeapYear from "dayjs/plugin/isLeapYear";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/zh-tw"; // import locale
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.locale("zh-tw"); // use locale
dayjs.extend(isLeapYear); // use plugin
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const isoDate = (): string =>
  dayjs().utcOffset(8).format("YYYY-MM-DDTHH:mm:ss.SSS") + "Z";
export const slashDate = (date: Date): string =>
  dayjs(date).utcOffset(8).format("YYYY/MM/DD");

// 判斷系統當下時段 上午 下午 晚上
// 晚上時間會變成晚上 暫時先用非上午 就是下午
export const period = (): string =>
  dayjs().utcOffset(8).format("A") === "上午" ? "上午" : "下午";

export const combinedDateTimeString = (): string =>
  dayjs().utcOffset(8).format("YYYYMMDDHHmmss");

export const randomDateTimeString = (month: number): string => {
  // 計算隨機生成的月份的最大日期
  const maxDate = dayjs()
    .set("month", month - 1)
    .endOf("month")
    .date();

  // 生成介於1和最大日期之間的隨機整數
  const randomDate = Math.floor(Math.random() * maxDate) + 1;
  // 隨機生成0到23之間的小時
  const randomHour = Math.floor(Math.random() * 24);

  // 隨機生成0到59之間的分鐘
  const randomMinute = Math.floor(Math.random() * 60);

  // 隨機生成0到59之間的秒
  const randomSecond = Math.floor(Math.random() * 60);
  // 設置日期物件的月份和日期
  const dateObject = dayjs()
    .set("month", month - 1)
    .set("date", randomDate)
    .set("hour", randomHour)
    .set("minute", randomMinute)
    .set("second", randomSecond);
  const timeStamp = dateObject.utcOffset(8).format("YYYYMMDDHHmmss");

  return timeStamp;
};

export default dayjs;
