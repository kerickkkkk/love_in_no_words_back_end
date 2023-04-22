export enum Message {
  // API結果
  RESULT_SUCCESS = "成功",
  // Token錯誤訊息
  NO_TOKEN = "請輸入token",
  USER_NOT_FOUND = "非有效使用者token",
  NOT_OWNER_AUTH = "非店長權限",

  // API錯誤訊息
  PAGE_NEED_IN_NUMBER = "頁碼請以數字輸入",
  PAGE_NOT_FOUND = "查無此頁碼",
}
