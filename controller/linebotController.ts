import { products } from './productsController';
import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import ProductManagementModel from "../models/productManagementModel";
import ProductTypeModel from "../models/productTypeModel";
import ReservationModel from "../models/reservationModel";
import TableManagementModel from '../models/tableManagementModel';
import dayjs, { period } from '../utils/dayjs';
import validator from 'validator';
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
export const findReservation = async (phone: string) => {
  const result = await ReservationModel.find({
    phone,
    isCanceled: false
  })
  return result || []
}

export const validateTelephone = (telephone: string) => {
  return validator.isMobilePhone(telephone, 'zh-TW');
}

// event handler
const handleEvent = async (event: any) => {
  if (event.type !== 'postback' && (event.type !== 'message' || event.message.type !== 'text')) {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  const text: any = event.type !== 'postback' ? event.message.text : event.postback.data

  let echo: any
  try {
    switch (true) {
      case /店名/i.test(text): {
        echo = { type: 'text', text: '傲嬌甜點' };
        break;
      }
      case /組別/i.test(text): {
        echo = { type: 'text', text: '南 1 組' };
        break;
      }
      case /客服/i.test(text): {
        echo = {
          type: 'flex',
          altText: '官網',
          contents: {
            "type": "bubble",
            "hero": {
              "type": "image",
              "url": "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images/1d44b4f6-261c-40e7-afd9-ef0b134ac336.jpg?GoogleAccessId=firebase-adminsdk-vpr58%40love-in-no-words-back-end.iam.gserviceaccount.com&Expires=16756675200&Signature=LHa4xKEBIHICfotf9a5OiOsacjeVYFLaMB38hWuYH6jz80IWuZD4q6I1bXlX8lsKkRVc6FuY%2F96JjFmtKgvqUwPCaZNf2Tibi01QWV09544wzQiE69mKCrWzpkHuB8b%2FsgMNdgxVf7LBiUWFeu43fP0tVsNl3MxrAUxXhcW%2B96lgn0XLqIDqAY%2BlOrvOHccEU4mIYruZficpLiQoEWUypdJDGAuYNx5bRKHBL%2Ftq2HIkJun2AdhTxC5sOhQBenTXYrXkJF%2FEGiufwFdkSt5R4dzIE4OQ26I7KXQ6cy0o%2B28tfL8Tjwcxs4xsjmAPhh9Obs%2BpnyWJW7AzM3PlF8pvFg%3D%3D",
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
                  "text": "POS 客服",
                  "weight": "bold",
                  "size": "xl"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "margin": "lg",
                  "spacing": "sm",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "vertical",
                      "spacing": "sm",
                      "contents": [
                        {
                          "type": "text",
                          "text": "- 回覆時間為平日上班 9:00 ~ 18:00 ",
                          "wrap": true,
                          "color": "#666666",
                          "size": "sm",
                          "flex": 5
                        },
                        {
                          "type": "text",
                          "text": "- 請先留下您的問題，便於客服人員盡快回覆",
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
                    "label": "[真人] 客服",
                    "uri": "line://ti/p/@700iyjwu"
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
        }

        break;
      }
      case /官網/i.test(text): {
        echo =
        {
          type: 'flex',
          altText: '官網',
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
                    "uri": "https://love-in-no-words-front-end.onrender.com/"
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
      case /訂位取消-/i.test(text): {
        const reservationId = text.split('訂位取消-')[1]
        echo = echo = { type: 'text', text: `訂位取消: ${reservationId} 未實作` };
        break;
      }
      case /訂位-/i.test(text): {
        const phone = text.split('訂位-')[1]
        if (validateTelephone(phone)) {
          const findResult: any[] = await findReservation(phone)
          if (findResult.length > 0) {
            echo = {
              type: 'flex',
              altText: '官網',
              contents: {
                "type": "carousel",
                "contents": []
              }
            }
            findResult.forEach(item => {
              echo.contents.contents.push({
                "type": "bubble",
                "body": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "text",
                      "text": "預約資訊",
                      "weight": "bold",
                      "color": "#1DB446",
                      "size": "sm"
                    },
                    {
                      "type": "text",
                      "text": `${item.name} 先生/小姐`,
                      "weight": "bold",
                      "size": "xxl",
                      "margin": "md"
                    },
                    {
                      "type": "separator",
                      "margin": "xxl"
                    },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "margin": "xxl",
                      "spacing": "sm",
                      "contents": [
                        {
                          "type": "box",
                          "layout": "horizontal",
                          "contents": [
                            {
                              "type": "text",
                              "text": "座位名稱",
                              "size": "sm",
                              "color": "#555555",
                              "flex": 0
                            },
                            {
                              "type": "text",
                              "text": item.tableInofo.tableName.toString(),
                              "size": "sm",
                              "color": "#111111",
                              "align": "end"
                            }
                          ]
                        },
                        {
                          "type": "box",
                          "layout": "horizontal",
                          "contents": [
                            {
                              "type": "text",
                              "text": "座位人數",
                              "size": "sm",
                              "color": "#555555",
                              "flex": 0
                            },
                            {
                              "type": "text",
                              "text": item.tableInofo.seats.toString(),
                              "size": "sm",
                              "color": "#111111",
                              "align": "end"
                            }
                          ]
                        },
                        {
                          "type": "separator",
                          "margin": "xxl"
                        },
                        {
                          "type": "box",
                          "layout": "horizontal",
                          "margin": "xxl",
                          "contents": [
                            {
                              "type": "text",
                              "text": "時間",
                              "size": "sm",
                              "color": "#555555"
                            },
                            {
                              "type": "text",
                              "text": item.reservationDate,
                              "size": "sm",
                              "color": "#111111",
                              "align": "end"
                            }
                          ]
                        },
                        {
                          "type": "box",
                          "layout": "horizontal",
                          "contents": [
                            {
                              "type": "text",
                              "text": "時段",
                              "size": "sm",
                              "color": "#555555"
                            },
                            {
                              "type": "text",
                              "text": item.reservationTime,
                              "size": "sm",
                              "color": "#111111",
                              "align": "end"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "type": "separator",
                      "margin": "xxl"
                    },
                    {
                      "type": "box",
                      "layout": "horizontal",
                      "margin": "md",
                      "contents": [
                        {
                          "type": "text",
                          "text": "預約 ID",
                          "size": "xs",
                          "color": "#aaaaaa",
                          "flex": 0
                        },
                        {
                          "type": "text",
                          "text": "6458ff1fdbc8a20949305e8e",
                          "color": "#aaaaaa",
                          "size": "xs",
                          "align": "end"
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
                        "type": "postback",
                        "label": "訂位取消",
                        "data": `訂位取消-${item._id.toString()}`
                      }
                    }
                  ]
                }
              })
            })
          } else {
            echo = { type: 'text', text: `查無電話: ${phone} 的訂位訊息` };
          }
        } else {
          echo = { type: 'text', text: "電話有誤。請輸入：訂位-0912345678(共十碼)" };
        }
        break;
      }
      case /訂位/i.test(text): {
        echo = { type: 'text', text: "請輸入：訂位-0912345678(共十碼)" };
        break;
      }
      case /座位/i.test(text): {
        const now = dayjs().format('YYYY-MM-DD')
        const periodTime = period()

        const getReservation = await ReservationModel.find({
          reservationDate: now,
          reservationTime: periodTime,
          isCanceled: false,
        })

        const totalTable = await TableManagementModel.find({
          isDisabled: false,
          isDeleted: false,
        })

        const emptyTable = totalTable.filter(item => {
          return (getReservation.find(reservation => reservation.tableInofo.tableNo === item.tableNo) === undefined)
        })

        echo = {
          type: 'flex',
          altText: '商品',
          contents: {
            "type": "bubble",
            "hero": {
              "type": "image",
              "url": "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images/e1214d2a-5e81-4fd0-a997-9d7a29f6420a.jpg?GoogleAccessId=firebase-adminsdk-vpr58%40love-in-no-words-back-end.iam.gserviceaccount.com&Expires=16756675200&Signature=HiHzLJCh7TropGbmSAPaRLPmRaWMeQ1TDWRc%2FMyV1WTx65YvLOlocgAA1GdAbYlivVgK5pDHyIt10%2FrCKZjix1f%2BabECPU6yTyBJbTXCfXbldDLY%2BXn26WMqS%2BLLrCykXiBkuSArzFmpS%2FTxOBqUfHDaLUZzmNhnD%2BYrGiu5lmCj9OOy5DFcQScNst%2Bvlcw3iGJBNWkAwOZl2UGKW3ZHuOdYaHIl81Ru1dU6Iuu5qoFgDQeLuNph6C9u6sfdpiOu3cLFfStg48YcH4gAEg3Ytsz29GHXZ%2FThVkH1VadvPHMc8bDFIVrx0o2s6y6wjM7s9BFunkKj4DbLFxs6Dk%2B6sA%3D%3D",
              "size": "full",
              "aspectRatio": "20:13",
              "aspectMode": "cover"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "查詢座位數",
                  "weight": "bold",
                  "size": "lg"
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
                          "text": "可預約桌數",
                          "color": "#aaaaaa",
                          "size": "sm",
                          "flex": 2
                        },
                        {
                          "type": "text",
                          "text": emptyTable.length.toString(),
                          "wrap": true,
                          "size": "3xl",
                          "flex": 5,
                          "align": "center",
                          "weight": "bold",
                          "color": `${emptyTable.length <= 0 ? "#dc3545" : "#1DB446"}`
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
                          "text": "時段",
                          "color": "#aaaaaa",
                          "size": "sm",
                          "flex": 2
                        },
                        {
                          "type": "text",
                          "text": `${now}(${periodTime})`,
                          "color": "#aaaaaa",
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
                    "label": "[真人] 客服",
                    "uri": "line://ti/p/@700iyjwu"
                  }
                }
              ],
              "flex": 0
            }
          }
        }
        break;
      }

      default:
        echo = { type: 'text', text: "可輸入關鍵字：店名、組別、官網、商品、訂位" };
        break;
    }
  } catch (error) {
    echo = { type: 'text', text: "可輸入關鍵字：店名、組別、官網、商品、訂位" };
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

