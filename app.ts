import express from'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import indexRouter from './routes/index'
import usersRouter from './routes/users'
import handleAllError from './service/handleAllError'
import notFound from './service/notFound'

const app = express();

// 程式出現重大錯誤時
process.on('uncaughtException', err => {
    // 記錄錯誤下來，等到服務都處理完後，停掉該 process
      console.error('Uncaughted Exception！')
      console.error(err);
      process.exit(1);
});

import './connection'

app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// 404 錯誤
app.use( notFound );

// 統一管理錯誤處理
app.use( handleAllError );

// 未捕捉到的 catch 
process.on('unhandledRejection', (err, promise) => {
    console.error('未捕捉到的 rejection：', promise, '原因：', err);
});

export default app;
