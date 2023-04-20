import dayjs from 'dayjs'
import isLeapYear from 'dayjs/plugin/isLeapYear' 
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/zh-tw' // import locale
    
dayjs.locale('zh-tw') // use locale
dayjs.extend(isLeapYear) // use plugin
dayjs.extend(utc);
dayjs.extend(timezone);

export const isoDate = () : string => (dayjs().utcOffset(8).format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z')

export default dayjs
