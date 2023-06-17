import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import { Client } from "@line/bot-sdk"
import dotenv from 'dotenv'
dotenv.config();
let client: any
if (process.env.NODE_ENV !== 'test') {
  const config: any = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
  };
  // create LINE SDK client
  client = new Client(config);
}
// event handler
const handleEvent = (event: any) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  let text = event.message.text
  const storeName = /店名/
  const groupNmae = /組別/
  if (storeName.test(event.message.text)) {
    text = '傲嬌甜點'
  } else if (groupNmae.test(event.message.text)) {
    text = '南 1 組'
  } else {
    text = "可輸入關鍵字：店名、組別"
  }
  // create a echoing text message
  const echo: any = { type: 'text', text };

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

export const linebot = {
  webhook: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => {
          res.json(result)
        })
        .catch((err) => {
          console.error(err);
          res.status(500).end();
        });
    }
  ),

};

export default linebot;

