import supertest from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../../app";
import dayjs from "../../utils/dayjs";
// import redisMock from 'redis-mock'; // 导入模拟库

// const redisClient = redisMock.createClient();
describe("店長", () => {
  beforeAll(async () => {
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoose.connection.close();
    // redisClient.quit();
  });
  let token = "";
  const userSignUpPayload = {
    name: "我是店長",
    phone: "0999999999",
    email: "loveinnowords@gmail.com",
    password: "edvfhaf1234da",
    confirmPassword: "edvfhaf1234da",
    isDisabled: false,
  };
  test("sign_up", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/users/sign_up")
      .send(userSignUpPayload);
    token = body.data.user.token;
    expect(statusCode).toBe(200);
  });

  const userPayload = {
    phone: "0999999999",
    password: "edvfhaf1234da",
  };
  test("login", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/users/login")
      .send(userPayload);
    token = body.data.user.token;
    expect(statusCode).toBe(200);
  });

  // 建立座位
  const seatsPayload = {
    tableName: 1,
    seats: 2,
  };
  test("O-2-4 新增座位", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/seats/admin")
      .set("Authorization", `Bearer ${token}`)
      .send(seatsPayload);
    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.tableNo).toBe(1);
    expect(body.data.tableName).toBe(seatsPayload.tableName);
    expect(body.data.seats).toBe(seatsPayload.seats);
  });

  // 建立商品分類
  const productsTypePayload = {
    productsTypeName: "甜點",
  };
  test(`O-3-7 新增 商品分類: ${productsTypePayload.productsTypeName}`, async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/products/admin/dessertcodes")
      .set("Authorization", `Bearer ${token}`)
      .send(productsTypePayload);

    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.productsType).toBe(1);
    expect(body.data.productsTypeName).toBe(
      productsTypePayload.productsTypeName
    );
  });

  const productsTypePayload2 = {
    productsTypeName: "飲料",
  };
  test(`O-3-7 新增 商品分類: ${productsTypePayload2.productsTypeName}`, async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/products/admin/dessertcodes")
      .set("Authorization", `Bearer ${token}`)
      .send(productsTypePayload2);

    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.productsType).toBe(2);
    expect(body.data.productsTypeName).toBe(
      productsTypePayload2.productsTypeName
    );
  });

  // 建立商品
  const productPayload = {
    productName: "蜂蜜蛋糕",
    photoUrl: "{{photoUrl}}",
    price: 100,
    inStockAmount: 100,
    safeStockAmount: 50,
    productsType: 1,
    productionTime: 10,
    description: "好吃",
    isDisabled: false,
  };
  test(`O-3-3 新增 商品 : ${productPayload.productName}`, async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/products/admin")
      .set("Authorization", `Bearer ${token}`)
      // .set('content-type', '/image')
      .send(productPayload);
    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.productName).toBe(productPayload.productName);
    expect(body.data.price).toBe(productPayload.price);
  });

  const productPayload2 = {
    productName: "蜂蜜檸檬水",
    photoUrl: "{{photoUrl}}",
    price: 165,
    inStockAmount: 100,
    safeStockAmount: 50,
    productsType: 2,
    productionTime: 10,
    description: "好吃",
    isDisabled: false,
  };
  test(`O-3-3 新增 商品 : ${productPayload2.productName}`, async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/products/admin")
      .set("Authorization", `Bearer ${token}`)
      // .set('content-type', '/image')
      .send(productPayload2);
    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.productName).toBe(productPayload2.productName);
    expect(body.data.price).toBe(productPayload2.price);
  });

  let couponNo = "";
  // 建立優惠券
  const couponPayload = {
    couponName: "九折卷test",
    couponCode: "off-test-90",
    discount: 90,
    isDisabled: false,
  };
  test("O-4-2 新增 優惠活動", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/coupons/admin")
      .set("Authorization", `Bearer ${token}`)
      .send(couponPayload);
    couponNo = body.data.couponNo;
    expect(statusCode).toBe(200);
    expect(body.data.couponNo).toBe("A000000001");
    expect(body.data.couponName).toBe(couponPayload.couponName);
    expect(body.data.couponCode).toBe(couponPayload.couponCode);
    expect(body.data.discount).toBe(couponPayload.discount);
    expect(body.data.isDisabled).toBe(couponPayload.isDisabled);
  });

  let orderNo = "";
  let order_id = "";
  // 建立訂單
  const orderPayload = {
    tableName: 1,
    products: [
      {
        productNo: 1,
        qty: 1,
      },
      {
        productNo: 2,
        qty: 1,
      },
    ],
    couponNo,
  };
  const rating = {
    payment: "現金",
    orderType: "已結帳",
    satisfaction: 9,
    description: "description",
  };
  describe("店長 - 訂單", () => {
    test("S-2-1 查詢類別商品", async () => {
      const { statusCode, body } = await supertest(app)
        .get("/v1/products/")
        .set("Authorization", `Bearer ${token}`)
        .query({ productsType: 1 });
      expect(statusCode).toBe(200);
      expect(body.data).toContainEqual(
        expect.objectContaining({
          productsType: expect.objectContaining({
            productsType: 1,
          }),
        })
      );
    });
    test("S-2-2 金額試算", async () => {
      const { statusCode, body } = await supertest(app)
        .post("/v1/orders/calculate/total-price")
        .set("Authorization", `Bearer ${token}`)
        // 要寫在裡面不然 couponNo 吃不到
        .send({
          tableName: 1,
          products: [
            {
              productNo: 1,
              qty: 1,
            },
            {
              productNo: 2,
              qty: 1,
            },
          ],
          couponNo,
        });
      orderNo = body.data.orderNo;
      order_id = body.data._id;
      expect(statusCode).toBe(200);
      expect(body.status).toBe("OK");
      expect(body.data.tableName).toBe(orderPayload.tableName);
      // 比對陣列中有的物件屬性
      expect(body.data.orderList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ productNo: 1 }),
          expect.objectContaining({ productNo: 2 }),
        ])
      );
      expect(body.data.couponNo).toBe(couponNo);
    });
    test("S-2-3 新增訂單", async () => {
      const { statusCode, body } = await supertest(app)
        .post("/v1/orders")
        .set("Authorization", `Bearer ${token}`)
        // 要寫在裡面不然 couponNo 吃不到
        .send({
          tableName: 1,
          products: [
            {
              productNo: 1,
              qty: 1,
            },
            {
              productNo: 2,
              qty: 1,
            },
          ],
          couponNo,
        });
      orderNo = body.data.orderNo;
      order_id = body.data._id;
      expect(statusCode).toBe(200);
      expect(body.status).toBe("OK");
      expect(body.data.tableName).toBe(orderPayload.tableName);
      // 比對陣列中有的物件屬性
      expect(body.data.orderDetail.orderList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ productNo: 1 }),
          expect.objectContaining({ productNo: 2 }),
        ])
      );
      expect(body.data.orderDetail.couponNo).toBe(couponNo);
    });
    test("S-3-1 訂單查詢", async () => {
      const { statusCode, body } = await supertest(app)
        .get("/v1/orders")
        .set("Authorization", `Bearer ${token}`);
      expect(statusCode).toBe(200);
      expect(body.data.ordersList).toEqual(
        expect.arrayContaining([expect.objectContaining({ orderNo })])
      );
    });
    test("S-3-3 滿意度及建議回饋", async () => {
      const { statusCode, body } = await supertest(app)
        .post(`/v1/orders/rating/${order_id}`)
        .set("Authorization", `Bearer ${token}`)
        .send(rating);
      expect(statusCode).toBe(200);
      expect(body.data.data._id).toBe(order_id);
    });
  });

  describe("店長 - 報表", () => {
    // test("S-5-1 結帳 : 取得 LinePay 結帳畫面", async () => {
    //     const response = await supertest(app)
    //         .post(`/v1/line_pay/${orderNo}`)
    //         .set('Content-Type', 'application/x-www-form-urlencoded')
    //         .send({ '_token': token })
    //         .query({ redirectDevUrl: true })
    //     expect(response.headers['location']).toMatch(/sandbox-web-pay.line.me/)
    // })

    // // 因無法結帳 至少進去確定可以拿取資料
    // test("S-5-2 查詢是否結帳 : 取得 LinePay 狀態碼", async () => {
    //     const { statusCode, body } = await supertest(app)
    //         .get(`/v1/line_pay/check/${orderNo}`)
    //         .set('Authorization', `Bearer ${token}`)
    //         .query({ redirectDevUrl: true })
    //     expect(statusCode).toBe(400)
    //     expect(body.message).toMatch(/Transaction record not found/)
    // })

    test("O-5-1  獲取營收資料", async () => {
      const { statusCode, body } = await supertest(app)
        .get("/v1/send/email/admin/revenue/report")
        .set("Authorization", `Bearer ${token}`);
      const month = +dayjs(orderNo, "YYYYMMDDHHmmss").format("M");
      expect(statusCode).toBe(200);
      expect(body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ month })])
      );
    });
    // test("O-5-1  獲取營收資料 - Redis 快取", async () => {
    //     const { statusCode, body } = await supertest(app)
    //         .get('/v1/send/email/admin/revenue/report')
    //         .set('Authorization', `Bearer ${token}`)
    //     expect(statusCode).toBe(200)
    //     expect(body.message).toContain("快取");
    // })

    test("O-5-2 獲取賣出數量資料", async () => {
      const { statusCode, body } = await supertest(app)
        .get("/v1/send/email/admin/sell-quantity/report")
        .set("Authorization", `Bearer ${token}`);
      expect(statusCode).toBe(200);
      expect(body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ productNo: 1 }),
          expect.objectContaining({ productNo: 2 }),
        ])
      );
    });
    // test("O-5-2 獲取賣出數量資料 - Redis 快取", async () => {
    //     const { statusCode, body } = await supertest(app)
    //         .get('/v1/send/email/admin/sell-quantity/report')
    //         .set('Authorization', `Bearer ${token}`)
    //     expect(statusCode).toBe(200)
    //     expect(body.message).toContain("快取");

    // })
    test("O-5-3 獲取訂單數量資料", async () => {
      const { statusCode, body } = await supertest(app)
        .get("/v1/send/email/admin/orders-quantity/report")
        .set("Authorization", `Bearer ${token}`);
      const month = +dayjs(orderNo, "YYYYMMDDHHmmss").format("M");
      expect(statusCode).toBe(200);
      expect(body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ month })])
      );
    });
    // test("O-5-3 獲取訂單數量資料 - Redis 快取", async () => {
    //     const { statusCode, body } = await supertest(app)
    //         .get('/v1/send/email/admin/orders-quantity/report')
    //         .set('Authorization', `Bearer ${token}`)
    //     expect(statusCode).toBe(200)
    //     expect(body.message).toContain("快取");

    // })
    // 寄送報表會一直寄所以先註解
    // test("O-5-4 寄送報表", async () => {
    //     const { statusCode, body } = await supertest(app)
    //         .get('/v1/send/email/admin/report/2')
    //         .set('Authorization', `Bearer ${token}`)
    //     expect(statusCode).toBe(200)
    //     expect(body.message).toBe('報表寄送成功')
    // })
    test("O-5-5 獲取訂單數量資料", async () => {
      const month = +dayjs(orderNo, "YYYYMMDDHHmmss").format("M");
      const { statusCode, body } = await supertest(app)
        .get("/v1/reports/admin/orders")
        .set("Authorization", `Bearer ${token}`)
        .query({
          month,
          number: 100,
        });
      expect(statusCode).toBe(200);
      body.data.data.forEach((item: any) => {
        expect(+dayjs(item.createdAt).format("M")).toBe(month);
      });
    });
    // test("O-5-5 獲取訂單數量資料 - Redis 快取", async () => {
    //     const month = +dayjs(orderNo, 'YYYYMMDDHHmmss').format('M');
    //     const { statusCode, body } = await supertest(app)
    //         .get('/v1/reports/admin/orders')
    //         .set('Authorization', `Bearer ${token}`)
    //         .query({
    //             month,
    //             number: 100
    //         })
    //     expect(statusCode).toBe(200)
    //     expect(body.message).toContain("快取");
    // })
    test("O-5-6 獲取訂單數量資料", async () => {
      const month = +dayjs(orderNo, "YYYYMMDDHHmmss").format("M");
      const response = await supertest(app)
        .get("/v1/reports/admin/orders/download")
        .set("Authorization", `Bearer ${token}`)
        .query({
          month,
          dataAmount: 100,
        })
        .responseType("buffer");
      expect(response.statusCode).toBe(200);
      expect(response.body instanceof Buffer).toBe(true);
      expect(response.headers["content-type"]).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(response.headers["content-disposition"]).toContain(
        "attachment; filename*=UTF-8"
      );
      expect(response.headers["content-disposition"]).toContain("xlsx");
    });
  });
});
