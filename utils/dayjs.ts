import dayjs from "dayjs";
import isLeapYear from "dayjs/plugin/isLeapYear";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/zh-tw"; // import locale
import customParseFormat from "dayjs/plugin/customParseFormat"

dayjs.locale("zh-tw"); // use locale
dayjs.extend(isLeapYear); // use plugin
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat)

export const isoDate = (): string =>
  dayjs().utcOffset(8).format("YYYY-MM-DDTHH:mm:ss.SSS") + "Z";
export const slashDate = (date: Date): string =>
  dayjs(date).utcOffset(8).format("YYYY/MM/DD");

// 判斷系統當下時段 上午 下午 晚上
// 晚上時間會變成晚上 暫時先用非上午 就是下午
export const period = (): string =>
  (dayjs().utcOffset(8).format("A") === "上午" ? "上午" : "下午")

export const combinedDateTimeString = (): string =>
  dayjs().utcOffset(8).format("YYYYMMDDHHmmss");

export default dayjs;
