import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config();

let DB = ''
if( process.env.NODE_ENV === 'dev'){
  // 注意 使用 localhost 會連不到 目前看版本 up node 17up 要改成 127.0.0.1
  DB = 'mongodb://127.0.0.1:27017/dessert'
}else {
  //  process.env 對象來訪問環境變量時，編譯器會警告變量可能為 undefined。這是因為在運行時，這些變量可能不存在或未定義。因此，在 TypeScript 中，必須明確地告訴編譯器，這些變量已經定義或可以為 undefined。
  DB = process.env.DATABASE!.replace(
    '<password>',
    process.env.DATABASE_PASSWORD!
  );
}
mongoose
  .connect(DB)
  .then(() => console.log(`${process.env.NODE_ENV} - 資料庫連線成功`))
  .catch((error: NodeJS.ErrnoException) => console.log('資料庫連線失敗', error));