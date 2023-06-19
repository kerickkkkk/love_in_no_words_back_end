import supertest from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../../app";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import path from "path";
import fs from "fs";

dayjs.extend(customParseFormat);
describe("店長 - 商品管理", () => {
  beforeAll(async () => {
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoose.connection.close();
  });
  let token = "";
  let tableNo = "";
  const userSignUpPayload = {
    name: "我是店長",
    phone: "0999999999",
    email: "test@test.com",
    password: "edvfhaf1234da",
    confirmPassword: "edvfhaf1234da",
    isDisabled: false,
  };
  const userPayload = {
    phone: "0999999999",
    password: "edvfhaf1234da",
  };

  test("sign_up", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/users/sign_up")
      .send(userSignUpPayload);
    token = body.data.user.token;
    expect(statusCode).toBe(200);
  });

  test("login", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/users/login")
      .send(userPayload);
    token = body.data.user.token;
    expect(statusCode).toBe(200);
  });

  test("O-3-2 上傳商品圖片API", async () => {
    const imagePath = path.join(__dirname, "..", "..", "/assets/img/LOGO.png");
    const imageBuffer = fs.readFileSync(imagePath);
    const { statusCode, body } = await supertest(app)
      .post("/v1/products/admin/uploadPhotos")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", imageBuffer, imagePath);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("成功");
  });
  const createProductType = {
    productsTypeName: "蛋糕",
  };
  const productTypePayload = {
    productsType: 1,
    productsTypeName: "蛋糕",
    isDeleted: false,
  };
  const getProductTypePayload = {
    _id: "",
    productsType: 1,
    productsTypeName: "蛋糕",
    createdAt: "",
  };
  test("O-3-7 新增商品分類API", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/products/admin/dessertcodes")
      .set("Authorization", `Bearer ${token}`)
      .send(createProductType);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("商品分類設定成功");
    expect(body.data).toEqual(expect.objectContaining(productTypePayload));
    getProductTypePayload._id = body.data._id;
    getProductTypePayload.createdAt = body.data.createdAt;
  });

  test("O-3-6 取得商品代號分類API", async () => {
    const { statusCode, body } = await supertest(app)
      .get("/v1/products/dessertcodes")
      .set("Authorization", `Bearer ${token}`);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("成功");
    expect(body.data).toEqual([getProductTypePayload]);
  });
  const createProduct = {
    productName: "忘情水",
    photoUrl:
      "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images/3e06bab2-39a9-48de-8a32-ed74552396d8.jpg?GoogleAccessId=firebase-adminsdk-vpr58%40love-in-no-words-back-end.iam.gserviceaccount.com&Expires=16756642800&Signature=E7oxfE7qVy92dYToeqM1C1vIWQj3FFlWvuGd27cETFYrR43TUDLnEaI7%2BDMmT2UJolvwvmlUgi%2BagMlueadyujYHocOvHOkVhBIHwD9e5ERcSOrEjjlyHc2Byj7E2h3m5Is7saXnGgY5VJsdUJRPv%2BDjJ7EHuTkzvgnMZ3Fa%2Fi8kWvTC%2F8EfEKBSMgy7E%2B0dFM0W1xlxILAJ7bjBwfh%2F9qnUJgJVDl%2B1Cu7Xg1%2FE5tpdulIgWwfYzjxLvo%2BNPW2qa%2FQQFfrva0Lt92vfNUhGRNX5H9pyF60%2FY9BT283J%2BByE1UaUpksUw%2BSWmWp64vYIA%2FSUuijm6b16wo6dwCr7fg%3D%3D",
    price: 100,
    inStockAmount: 60,
    safeStockAmount: 50,
    productsType: 1,
    productionTime: 10,
    description: "忘情水",
    isDisabled: false,
  };
  const createProductPayload = {
    productName: "忘情水",
    photoUrl:
      "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images/3e06bab2-39a9-48de-8a32-ed74552396d8.jpg?GoogleAccessId=firebase-adminsdk-vpr58%40love-in-no-words-back-end.iam.gserviceaccount.com&Expires=16756642800&Signature=E7oxfE7qVy92dYToeqM1C1vIWQj3FFlWvuGd27cETFYrR43TUDLnEaI7%2BDMmT2UJolvwvmlUgi%2BagMlueadyujYHocOvHOkVhBIHwD9e5ERcSOrEjjlyHc2Byj7E2h3m5Is7saXnGgY5VJsdUJRPv%2BDjJ7EHuTkzvgnMZ3Fa%2Fi8kWvTC%2F8EfEKBSMgy7E%2B0dFM0W1xlxILAJ7bjBwfh%2F9qnUJgJVDl%2B1Cu7Xg1%2FE5tpdulIgWwfYzjxLvo%2BNPW2qa%2FQQFfrva0Lt92vfNUhGRNX5H9pyF60%2FY9BT283J%2BByE1UaUpksUw%2BSWmWp64vYIA%2FSUuijm6b16wo6dwCr7fg%3D%3D",
    price: 100,
    inStockAmount: 60,
    safeStockAmount: 50,
    productNo: 1,
    productionTime: 10,
    description: "忘情水",
    isDisabled: false,
  };

  test("O-3-3 新增商品API", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/products/admin")
      .set("Authorization", `Bearer ${token}`)
      .send(createProduct);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("商品新增成功");
    expect(body.data).toEqual(expect.objectContaining(createProductPayload));
  });
  test("O-3-1 條件搜尋商品API", async () => {
    const { statusCode, body } = await supertest(app)
      .get("/v1/products/admin")
      .set("Authorization", `Bearer ${token}`);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("成功");
    expect(body.data).toEqual([expect.objectContaining(createProductPayload)]);
  });
  const patchProduct = {
    productName: "森林蛋糕",
    photoUrl:
      "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images/3e06bab2-39a9-48de-8a32-ed74552396d8.jpg?GoogleAccessId=firebase-adminsdk-vpr58%40love-in-no-words-back-end.iam.gserviceaccount.com&Expires=16756642800&Signature=E7oxfE7qVy92dYToeqM1C1vIWQj3FFlWvuGd27cETFYrR43TUDLnEaI7%2BDMmT2UJolvwvmlUgi%2BagMlueadyujYHocOvHOkVhBIHwD9e5ERcSOrEjjlyHc2Byj7E2h3m5Is7saXnGgY5VJsdUJRPv%2BDjJ7EHuTkzvgnMZ3Fa%2Fi8kWvTC%2F8EfEKBSMgy7E%2B0dFM0W1xlxILAJ7bjBwfh%2F9qnUJgJVDl%2B1Cu7Xg1%2FE5tpdulIgWwfYzjxLvo%2BNPW2qa%2FQQFfrva0Lt92vfNUhGRNX5H9pyF60%2FY9BT283J%2BByE1UaUpksUw%2BSWmWp64vYIA%2FSUuijm6b16wo6dwCr7fg%3D%3D",
    price: 100,
    inStockAmount: 60,
    safeStockAmount: 50,
    productsType: 1,
    productionTime: 10,
    description: "森林蛋糕",
    isDisabled: true,
  };
  const patchProductPayload = {
    productName: "森林蛋糕",
    photoUrl:
      "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images/3e06bab2-39a9-48de-8a32-ed74552396d8.jpg?GoogleAccessId=firebase-adminsdk-vpr58%40love-in-no-words-back-end.iam.gserviceaccount.com&Expires=16756642800&Signature=E7oxfE7qVy92dYToeqM1C1vIWQj3FFlWvuGd27cETFYrR43TUDLnEaI7%2BDMmT2UJolvwvmlUgi%2BagMlueadyujYHocOvHOkVhBIHwD9e5ERcSOrEjjlyHc2Byj7E2h3m5Is7saXnGgY5VJsdUJRPv%2BDjJ7EHuTkzvgnMZ3Fa%2Fi8kWvTC%2F8EfEKBSMgy7E%2B0dFM0W1xlxILAJ7bjBwfh%2F9qnUJgJVDl%2B1Cu7Xg1%2FE5tpdulIgWwfYzjxLvo%2BNPW2qa%2FQQFfrva0Lt92vfNUhGRNX5H9pyF60%2FY9BT283J%2BByE1UaUpksUw%2BSWmWp64vYIA%2FSUuijm6b16wo6dwCr7fg%3D%3D",
    price: 100,
    inStockAmount: 60,
    safeStockAmount: 50,
    productsType: expect.objectContaining({
      productsType: 1,
      productsTypeName: "蛋糕",
    }),
    productionTime: 10,
    description: "森林蛋糕",
    isDisabled: true,
  };
  test("O-3-4 修改商品API", async () => {
    const { statusCode, body } = await supertest(app)
      .patch("/v1/products/admin/1")
      .set("Authorization", `Bearer ${token}`)
      .send(patchProduct);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("商品修改成功");
    expect(body.data).toMatchObject(patchProductPayload);
  });
  test("O-3-5 刪除商品API", async () => {
    const { statusCode, body } = await supertest(app)
      .delete("/v1/products/admin/1")
      .set("Authorization", `Bearer ${token}`);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("商品刪除成功");
    expect(body.data).toMatchObject(patchProductPayload);
    const { statusCode: checkStatusCode, body: checkBody } = await supertest(
      app
    )
      .get("/v1/products/admin")
      .set("Authorization", `Bearer ${token}`);
    expect(checkStatusCode).toBe(200);
    expect(checkBody.message).toBe("成功");
    expect(checkBody.data).toEqual([]);
  });

  test("O-3-8 刪除商品分類API", async () => {
    const { statusCode, body } = await supertest(app)
      .delete("/v1/products/admin/dessertcodes/1")
      .set("Authorization", `Bearer ${token}`);

    expect(statusCode).toBe(200);
    expect(body.message).toBe("刪除成功");
    expect(body.data).toEqual(getProductTypePayload);
    const { statusCode: checkStatusCode, body: checkBody } = await supertest(
      app
    )
      .get("/v1/products/dessertcodes")
      .set("Authorization", `Bearer ${token}`);
    expect(checkStatusCode).toBe(200);
    expect(checkBody.message).toBe("成功");
    expect(checkBody.data).toEqual([]);
  });
});
