export enum Message {
  // Schema入力欄確認
  NEED_INPUT_NAME = "請輸入姓名",
  NEED_INPUT_PHONE = "請輸入正確電話格式",
  NEED_INPUT_TITLENO = "請輸入正確職位代號",
  NEED_INPUT_STATUS = "狀態請以布林值形式輸入",
  NEED_INPUT_PASSWORD = "密碼少於 8 位數",
  NEED_INPUT_RESERVATIONTIME = "請輸入正確訂位時段",
  NEED_INPUT_RESERVATIONDATE = "請輸入正確訂位日期",
  NEED_INPUT_RESERVATION_STATUS = "請輸入正確狀態",
  SAME_PHONE_REGISTERED = "相同電話已註冊",
  TITLENO_TRANSFER_ERROR = "店家人員與會員轉換不可直接修改轉換",
  NEED_INPUT_TABLENO = "請輸入正確桌號",
  NEED_CORRECT_RESERVATION_DATE = "請輸入正確訂位日期格式，且預定日必須等於或大於當日",
  NEED_CORRECT_RESERVATION_TIME = "請輸入正確訂位時段",
  // API返回內容錯誤訊息
  PAGE_NEED_IN_NUMBER = "頁碼請以數字輸入",
  PAGE_NOT_FOUND = "查無此頁碼",
  ID_NOT_FOUND = "無該使用者資料",
  HAD_RESERVARTION = "相同時段該坐位已被預約",

  // API結果
  RESULT_SUCCESS = "成功",
  CREATE_SUCCESS = "新增成功",
  REVISE_SUCCESS = "修改成功",
  DELETE_SUCCESS = "刪除成功",

  // Token錯誤訊息
  NO_TOKEN = "請輸入token",
  USER_NOT_FOUND = "非有效使用者token",
  NOT_OWNER_AUTH = "非店長權限",
}
