import { products } from './productsController';
import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import ProductManagementModel from "../models/productManagementModel";
import ProductTypeModel from "../models/productTypeModel";
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
const handleEvent = async (event: any) => {
  if (event.type !== 'postback' && (event.type !== 'message' || event.message.type !== 'text')) {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  const text: any = event.type !== 'postback' ? event.message.text : event.postback.data

  let echo: any
  switch (true) {
    case /店名/i.test(text): {
      echo = { type: 'text', text: '傲嬌甜點' };
      break;
    }
    case /組別/i.test(text): {
      echo = { type: 'text', text: '南 1 組' };
      break;
    }
    case /官網/i.test(text): {
      echo =
      {
        type: 'flex',
        altText: '商品',
        contents: {
          "type": "carousel",
          "contents": [
            {
              "type": "bubble",
              "hero": {
                "type": "image",
                "url": "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images/b8dc19f9-c3e0-4a0d-b76e-3fab666d62b3.jpg?GoogleAccessId=firebase-adminsdk-vpr58%40love-in-no-words-back-end.iam.gserviceaccount.com&Expires=16756675200&Signature=sj5fV2CWVUAKHJecsiZkvE5M9n2hhoHLrmXUHr%2FlWesmi3nhBu%2FhwhZsmwKasjuOBmAO2f6BgHtS0EA3ngbgbr%2BfcNC%2Fpysm3AjB3wG9LA8rwW8vlmgOX0pVIeGmsAulxc673mVbOpFjAkuV3UjDppWgwbpdJvZLNcIf%2BqtPpL8Oyytym1EsMP3rpBe543YbPCnNPZLaab4xBKzC0PDgxNmrCTuL%2Fk80yqbBPHTrOKeoguCU6ejKiVN0hALQ%2Bl87kpFPGv8JB7gg0L1IeDGInujzh1PiIRhT36M%2FhulUVMMEt89ZVT5XskaWKMulAYb2%2Bb3U%2FUzYM9iIKXiQANHCLA%3D%3D",
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover",
                "action": {
                  "type": "uri",
                  "uri": "http://linecorp.com/"
                }
              },
              "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "text": "傲嬌甜點",
                    "weight": "bold",
                    "size": "xl"
                  },
                  {
                    "type": "box",
                    "layout": "baseline",
                    "margin": "md",
                    "contents": [
                      {
                        "type": "icon",
                        "size": "sm",
                        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                      },
                      {
                        "type": "icon",
                        "size": "sm",
                        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                      },
                      {
                        "type": "icon",
                        "size": "sm",
                        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                      },
                      {
                        "type": "icon",
                        "size": "sm",
                        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                      },
                      {
                        "type": "icon",
                        "size": "sm",
                        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                      },
                      {
                        "type": "text",
                        "text": "5.0",
                        "size": "sm",
                        "color": "#999999",
                        "margin": "md",
                        "flex": 0
                      }
                    ]
                  },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "box",
                        "layout": "baseline",
                        "spacing": "sm",
                        "contents": [
                          {
                            "type": "text",
                            "text": "營業時間",
                            "color": "#aaaaaa",
                            "size": "sm",
                            "flex": 2
                          },
                          {
                            "type": "text",
                            "text": "10:00 - 18:00",
                            "wrap": true,
                            "color": "#666666",
                            "size": "sm",
                            "flex": 5
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              "footer": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "button",
                    "style": "link",
                    "height": "sm",
                    "action": {
                      "type": "uri",
                      "label": "網頁",
                      "uri": "https://love-in-no-words-front-end.onrender.com/"
                    }
                  },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [],
                    "margin": "sm"
                  }
                ],
                "flex": 0
              }
            }
          ]
        }
      };
      break;
    }
    case /商品/i.test(text): {
      const productsTypes = await ProductTypeModel.find({
        isDeleted: false
      }).sort({
        productsType: 1,
      })
      const productsTypesAry = productsTypes.map(item => item.productsTypeName)
      echo =
      {
        type: 'flex',
        altText: '商品分類',
        contents: {
          "type": "carousel",
          "contents": [

          ]
        }
      }
      productsTypesAry.forEach((item, index) => {
        echo.contents.contents.push(
          {
            "type": "bubble",
            "size": "nano",
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": item,
                  "weight": "bold",
                  "size": "sm",
                  "wrap": true
                }
              ],
              "spacing": "sm",
              "paddingAll": "13px"
            },
            "action": {
              "type": "postback",
              "label": "action",
              "data": `分類：${item}`,
              "displayText": `商品分類：${item}`
            }
          }
        )
      })
      break;
    }
    case /分類：/i.test(text): {
      const category = text?.split('：')[1]
      const products = await ProductManagementModel.aggregate([
        {
          $lookup: {
            from: "productType",
            localField: "productsType",
            foreignField: "_id",
            as: "productTypeData",
          },
        },
        {
          $match: {
            "productTypeData.productsTypeName": category,
            $and: [
              { isDisabled: false },
              { isDeleted: false },
            ]
          },
        },
        {
          $addFields: {
            productsType: { $arrayElemAt: ["$productTypeData", 0] },
          },
        },
      ]).sort({
        productNo: 1,
      })
      console.log(products[0]);
      echo =
      {
        type: 'flex',
        altText: '商品',
        contents: {
          "type": "carousel",
          "contents": [

          ]
        }
      }

      products.forEach((item) => {
        echo.contents.contents.push({
          "type": "bubble",
          "size": "micro",
          "hero": {
            "type": "image",
            "url": item.photoUrl,
            "size": "full",
            "aspectMode": "cover",
            "aspectRatio": "320:213"
          },
          "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "text",
                "text": item.productName,
                "weight": "bold",
                "size": "sm",
                "wrap": true
              },
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "box",
                    "layout": "baseline",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "text",
                        "text": item.productsType.productsTypeName,
                        "wrap": true,
                        "color": "#8c8c8c",
                        "size": "xs",
                        "flex": 5
                      }
                    ]
                  },
                  {
                    "type": "box",
                    "layout": "baseline",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "text",
                        "text": item.description || '無',
                        "wrap": true,
                        "color": "#8c8c8c",
                        "size": "xs",
                        "flex": 5
                      }
                    ]
                  }
                ]
              }
            ],
            "spacing": "sm",
            "paddingAll": "13px"
          },
          "action":
          {
            "type": "uri",
            "label": "看大圖",
            "uri": item.photoUrl
          }
        })
      })
      break;
    }
    default:
      echo = { type: 'text', text: "可輸入關鍵字：店名、組別、官網、商品" };
      break;
  }

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

