import supertest from 'supertest'
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import dayjs from '../../utils/dayjs'
import app from '../../app'

describe('店員 - 訂單查詢系列', () => {
    beforeAll(async () => {
        const mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoose.connection.close();
    });
    let token = ''
    const userSignUpPayload = {
        "name": "我是店長",
        "phone": "0999999999",
        "email": "loveinnowords@gmail.com",
        "password": "edvfhaf1234da",
        "confirmPassword": "edvfhaf1234da",
        "isDisabled": false
    }
    test("sign_up", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/users/sign_up')
            .send(userSignUpPayload)
        token = body.data.user.token
        expect(statusCode).toBe(200)
    })

    const userPayload =
    {
        "phone": "0999999999",
        "password": "edvfhaf1234da"
    }
    test("login", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/users/login')
            .send(userPayload)
        token = body.data.user.token
        expect(statusCode).toBe(200)
    })

    // 建立座位
    const seatsPayload = {
        "tableName": 1,
        "seats": 2
    }
    test("O-2-4 新增座位 - tableName 1", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/seats/admin')
            .set('Authorization', `Bearer ${token}`)
            .send(seatsPayload)
        expect(statusCode).toBe(200)
        expect(body.data.tableNo).toBe(1)
        expect(body.data.tableName).toBe(seatsPayload.tableName)
        expect(body.data.seats).toBe(seatsPayload.seats)
    })

    const seatsPayload2 = {
        "tableName": 2,
        "seats": 6
    }
    test("O-2-4 新增座位 - tableName 2", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/seats/admin')
            .set('Authorization', `Bearer ${token}`)
            .send(seatsPayload2)
        expect(statusCode).toBe(200)
        expect(body.data.tableNo).toBe(2)
        expect(body.data.tableName).toBe(seatsPayload2.tableName)
        expect(body.data.seats).toBe(seatsPayload2.seats)
    })

    // 建立商品分類
    const productsTypePayload = {
        "productsTypeName": "甜點"
    }
    test(`O-3-7 新增 商品分類: ${productsTypePayload.productsTypeName}`, async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/products/admin/dessertcodes')
            .set('Authorization', `Bearer ${token}`)
            .send(productsTypePayload)

        expect(statusCode).toBe(200)
        expect(body.data.productsType).toBe(1)
        expect(body.data.productsTypeName).toBe(productsTypePayload.productsTypeName)
    })

    const productsTypePayload2 = {
        "productsTypeName": "飲料"
    }
    test(`O-3-7 新增 商品分類: ${productsTypePayload2.productsTypeName}`, async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/products/admin/dessertcodes')
            .set('Authorization', `Bearer ${token}`)
            .send(productsTypePayload2)

        expect(statusCode).toBe(200)
        expect(body.data.productsType).toBe(2)
        expect(body.data.productsTypeName).toBe(productsTypePayload2.productsTypeName)
    })

    // 建立商品
    const productPayload = {
        "productName": "蜂蜜蛋糕",
        "photoUrl": "{{photoUrl}}",
        "price": 100,
        "inStockAmount": 100,
        "safeStockAmount": 50,
        "productsType": 1,
        "productionTime": 10,
        "description": "好吃",
        "isDisabled": false
    }
    test(`O-3-3 新增 商品 : ${productPayload.productName}`, async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/products/admin')
            .set('Authorization', `Bearer ${token}`)
            // .set('content-type', '/image')
            .send(productPayload)
        expect(statusCode).toBe(200)
        expect(body.data.productName).toBe(productPayload.productName)
        expect(body.data.price).toBe(productPayload.price)
    })

    const productPayload2 = {
        "productName": "蜂蜜檸檬水",
        "photoUrl": "{{photoUrl}}",
        "price": 165,
        "inStockAmount": 100,
        "safeStockAmount": 50,
        "productsType": 2,
        "productionTime": 10,
        "description": "好吃",
        "isDisabled": false
    }
    test(`O-3-3 新增 商品 : ${productPayload2.productName}`, async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/products/admin')
            .set('Authorization', `Bearer ${token}`)
            // .set('content-type', '/image')
            .send(productPayload2)
        expect(statusCode).toBe(200)
        expect(body.data.productName).toBe(productPayload2.productName)
        expect(body.data.price).toBe(productPayload2.price)
    })

    let couponNo = ''
    // 建立優惠券
    const couponPayload = {
        "couponName": "九折卷test",
        "couponCode": "off-test-90",
        "discount": 90,
        "isDisabled": false
    }
    test("O-4-2 新增 優惠活動", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/coupons/admin')
            .set('Authorization', `Bearer ${token}`)
            .send(couponPayload)
        couponNo = body.data.couponNo
        expect(statusCode).toBe(200)
        expect(body.data.couponNo).toBe("A000000001")
        expect(body.data.couponName).toBe(couponPayload.couponName)
        expect(body.data.couponCode).toBe(couponPayload.couponCode)
        expect(body.data.discount).toBe(couponPayload.discount)
        expect(body.data.isDisabled).toBe(couponPayload.isDisabled)
    })

    const now = dayjs().format('YYYY-MM-DD');

    describe('店員 - 訂單 現金付款', () => {

        let orderNo = ''
        let order_id = ''
        let clerkToken = ''
        // 建立訂單
        const orderPayload = {
            tableName: 1,
            products: [
                {
                    productNo: 1,
                    qty: 10,
                    note: '蜂蜜要兩倍'
                },
                {
                    productNo: 2,
                    qty: 10,
                    note: '大杯 兩倍糖'
                }
            ],
            couponNo
        }
        const rating = {
            "orderType": "已結帳",
            "payment": "現金",
            "satisfaction": 9,
            "description": "顧客滿意度填寫意見區"
        }
        const clerkPayload = {
            name: "店員",
            phone: "0975026599",
            titleNo: 2,
            isDisabled: false,
            password: "advaefvad",
        };

        test("O-1-2 新增店員", async () => {
            const { statusCode, body } = await supertest(app)
                .post("/v1/users/admin")
                .set("Authorization", `Bearer ${token}`)
                .send(clerkPayload);
            expect(statusCode).toBe(200);
            expect(body.data).toMatchObject({
                name: clerkPayload.name,
                phone: clerkPayload.phone
            });
        })

        test("login - 店員", async () => {
            const { statusCode, body } = await supertest(app)
                .post('/v1/users/login')
                .send({
                    phone: clerkPayload.phone,
                    password: clerkPayload.password
                })
            expect(statusCode).toBe(200)
            expect(body.data.user).toMatchObject({
                name: clerkPayload.name,
                titleNo: clerkPayload.titleNo
            });
            clerkToken = body.data.user.token
        })
        test("S-2-1 查詢類別商品", async () => {
            const { statusCode, body } = await supertest(app)
                .get('/v1/products/')
                .set('Authorization', `Bearer ${clerkToken}`)
                .query({ productsType: 1 })
            expect(statusCode).toBe(200)
            expect(body.data).toContainEqual(
                expect.objectContaining({
                    productsType: expect.objectContaining({
                        productsType: 1
                    }),
                })
            )
        })
        test("S-2-2 金額試算", async () => {
            const { statusCode, body } = await supertest(app)
                .post('/v1/orders/calculate/total-price')
                .set('Authorization', `Bearer ${clerkToken}`)
                // 要寫在裡面不然 couponNo 吃不到
                .send({
                    tableName: 1,
                    products: [
                        {
                            productNo: 1,
                            qty: 10,
                            note: '蜂蜜要兩倍'
                        },
                        {
                            productNo: 2,
                            qty: 10,
                            note: '大杯 兩倍糖'
                        }
                    ],
                    couponNo
                })
            expect(statusCode).toBe(200)
            expect(body.data.tableName).toBe(orderPayload.tableName)
            // 比對陣列中有的物件屬性
            expect(body.data.orderList).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ productNo: 1 }),
                    expect.objectContaining({ productNo: 2 })
                ])
            );
            expect(body.data.couponNo).toBe(couponNo)
        })
        test("S-2-3 新增訂單", async () => {
            const { statusCode, body } = await supertest(app)
                .post('/v1/orders')
                .set('Authorization', `Bearer ${clerkToken}`)
                // 要寫在裡面不然 couponNo 吃不到
                .send({
                    tableName: 1,
                    products: [
                        {
                            productNo: 1,
                            qty: 1
                        },
                        {
                            productNo: 2,
                            qty: 1
                        }
                    ],
                    couponNo
                })
            orderNo = body.data.orderNo
            order_id = body.data._id
            expect(statusCode).toBe(200)
            expect(body.data.tableName).toBe(orderPayload.tableName)
            // 比對陣列中有的物件屬性
            expect(body.data.orderDetail.orderList).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ productNo: 1 }),
                    expect.objectContaining({ productNo: 2 })
                ])
            );
            expect(body.data.orderDetail.couponNo).toBe(couponNo)
        })

        test("S-3-1 訂單查詢 - createdAt ，orderStatus : 未結帳 ", async () => {
            const { statusCode, body } = await supertest(app)
                .get('/v1/orders')
                .set('Authorization', `Bearer ${clerkToken}`)
                .query({ createdAt: now })
            expect(statusCode).toBe(200)
            expect(body.data.ordersList).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ orderNo }),
                    expect.objectContaining({
                        orderStatus: "未結帳"
                    }),
                ])
            );
            body.data.ordersList.forEach((order: any) => {
                const result = dayjs(order.createdAt).isSame(now, 'day');
                expect(result).toBe(true);
            });
        })

        test("S-3-3 滿意度及建議回饋", async () => {
            const { statusCode, body } = await supertest(app)
                .post(`/v1/orders/rating/${order_id}`)
                .set('Authorization', `Bearer ${clerkToken}`)
                .send(rating)
            expect(statusCode).toBe(200)
            expect(body.data.data._id).toBe(order_id);
        })

        test("S-3-2 詳細訂單內容查詢: 確定 note, 滿意度調查", async () => {
            const { statusCode, body } = await supertest(app)
                .get(`/v1/orders/detail/${order_id}`)
                .set('Authorization', `Bearer ${clerkToken}`)
            expect(statusCode).toBe(200)
            // 有寫入詳細訂單 滿意度
            expect(body.data).toMatchObject({
                satisfaction: rating.satisfaction,
                description: rating.description,
            });
            // 包含 orderList 必須 包含 note 欄位
            expect(body.data.orderList).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ note: expect.anything() })
                ])
            );
        })

        test("S-3-1 訂單查詢 - 回找 orderId 的 payment 現金 orderStatus 為 已結帳 ", async () => {
            const { statusCode, body } = await supertest(app)
                .get('/v1/orders')
                .set('Authorization', `Bearer ${clerkToken}`)
                .query({ createdAt: now })
            expect(statusCode).toBe(200)
            const target = body.data.ordersList.find((item: any) => {
                return item.order_id = order_id
            });
            expect(target).toMatchObject({
                _id: order_id,
                payment: '現金',
                orderStatus: '已結帳'
            });
        })
    })

    // 獨立驗證可 一起驗證會有用到相同 ID 

    // describe('店長 - 訂單 LinePay 付款', () => {
    //     let orderNoLinePay = ''
    //     let order_idLinePay = ''
    //     const ratingLinePay = {
    //         "payment": "linepay",
    //         "orderType": "未結帳",
    //         "satisfaction": 9,
    //         "description": "linepay 訂單未結帳"
    //     }
    //     test("S-2-3 新增訂單", async () => {
    //         const { statusCode, body } = await supertest(app)
    //             .post('/v1/orders')
    //             .set('Authorization', `Bearer ${token}`)
    //             // 要寫在裡面不然 couponNo 吃不到
    //             .send({
    //                 tableName: 1,
    //                 products: [
    //                     {
    //                         productNo: 1,
    //                         qty: 10
    //                     },
    //                     {
    //                         productNo: 2,
    //                         qty: 10
    //                     }
    //                 ],
    //             })

    //         orderNoLinePay = body.data.orderNo
    //         order_idLinePay = body.data._id
    //         expect(statusCode).toBe(200)
    //         expect(body.data.tableName).toBe(1)
    //         // 比對陣列中有的物件屬性
    //         expect(body.data.orderDetail.orderList).toEqual(
    //             expect.arrayContaining([
    //                 expect.objectContaining({ productNo: 1 }),
    //                 expect.objectContaining({ productNo: 2 })
    //             ])
    //         );

    //     })
    //     test("S-3-3 滿意度及建議回饋", async () => {
    //         const { statusCode, body } = await supertest(app)
    //             .post(`/v1/orders/rating/${order_idLinePay}`)
    //             .set('Authorization', `Bearer ${token}`)
    //             .send(ratingLinePay)
    //         expect(statusCode).toBe(200)
    //         expect(body.data.data._id).toBe(order_idLinePay);
    //     })
    //     test("S-3-1 訂單查詢 - 回找 orderId 的 payment linepay orderStatus 為 未結帳 ", async () => {
    //         const { statusCode, body } = await supertest(app)
    //             .get('/v1/orders')
    //             .set('Authorization', `Bearer ${token}`)
    //         expect(statusCode).toBe(200)
    //         const target = body.data.ordersList.find((item: any) => {
    //             return item.order_id = order_idLinePay
    //         });
    //         expect(target).toMatchObject({
    //             _id: order_idLinePay,
    //             payment: 'linepay',
    //             orderStatus: '未結帳'
    //         });
    //     })
    // });
})

