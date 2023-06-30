# 傲嬌甜點 POS 系統 - 後端
<img width="1670" alt="POS" src="https://github.com/akizyfee/love_in_no_words_front_end/assets/47707287/d19f7892-b1d8-44e4-a0e8-ed228ff2273f">

## 專案介紹
[傲嬌甜點 POS 系統](https://love-in-no-words-front-end.onrender.com/#/) 的理念是「輕鬆管理，以智慧重新定義餐飲體驗」，
藉由人性化操作介面幫助店家解決管理的痛點、並且達成以下的目標：
* 讓店員容易地滿足顧客的需求
* 讓廚師輕鬆地掌控製作的進度
* 讓店長清楚地瞭解商店的營運


## 專案團隊
| 團隊成員       | 負責範圍          | GitHub 連結  |
| ------------- |:-------------:| -----:|
| Eva       | Leader / 前端  | [hiYifang](https://github.com/hiYifang) |
| Pause     | 前端           | [akizyfee](https://github.com/akizyfee) | 
| Christina | UIUX / 後端   | [ChrisC0210](https://github.com/ChrisC0210) |
| 艾瑞克     | 先行者 / 後端   | [kerickkkkk](https://github.com/kerickkkkk) |
| Kao / 祥  | 後端           | [Patrick-Kao](https://github.com/Patrick-Kao) |


## 開發技術

### 基礎環境
1. Node.js
2. Express
3. Mongo DB
4. Mongoose
5. Redis

### 工具
6. Validator.js
7. JsonWebToken
8. Dayjs
9. Socket.io
10. Axios
11. Nodemailer
12. Excel.js
13. Xlsx.js
14. Multer
15. Image Charts

### 測試
16. Jest
17. Supertest
18. Mongodb Memory Server
19. Redis Mock

### CI/CD 
20. GitHub Actions

## 第三方服務
* Firebase
* GMail
* Line Bot
* Line Pay
* Uptimerbot


## 資料夾說明
* `__mocks__` - 放置 mock 測試
* `__test__` - 對應資料夾的測試檔案
* `.github` - 放置控制 Github Actions 相關檔案
* `constants` - 公用的常數
* `dbData` - 預設資料
* `typs` - 放型別
* `service` - 服務類型
* `utils` - 工具類型
 

## CI/CD 說明

此專案有使用 Github Actions，所以發起 Pull Request 會自動執行以下動作：
* 建立 Node.js 環境
* 安裝相依套件
* 編譯程式碼
* 執行測試

當專案 merge 到 main 時會自動執行以下動作：
* 建立 Node.js 環境
* 安裝相依套件
* 編譯程式碼
* 執行測試
* 部署到 Render.com
