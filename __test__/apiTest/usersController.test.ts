import supertest from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../../app";

describe("店長 - 使用者", () => {
  beforeAll(async () => {
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoose.connection.close();
  });
  let token = "";
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
  const userListPayload = {
    meta: {
      pagination: {
        currentPage: 1,
        from: 1,
        lastPage: 1,
        nextPage: null,
        perPage: 10,
        prevPage: null,
        to: 1,
        total: 1,
      },
    },
    usersList: [
      expect.objectContaining({
        email: "test@test.com",
        isDisabled: false,
        name: "我是店長",
        number: "A000000001",
        phone: "0999999999",
        title: "店長",
        titleNo: 1,
      }),
    ],
  };
  const creatUserPayload = {
    name: "註冊廚師",
    phone: "0975026598",
    titleNo: "3",
    email: "a468223@gmail.com",
    isDisabled: false,
    password: "12345678",
  };
  const responseUserPayload = expect.objectContaining({
    name: "註冊廚師",
    phone: "0975026598",
    titleNo: 3,
    title: "廚師",
    isDisabled: false,
    revisedAt: null,
    isDeleted: false,
  });

  const updateUserPayload = {
    _id: "",
    name: "改成店員",
    phone: "0975026599",
    titleNo: 2,
    isDisabled: false,
    password: "12345678",
  };
  const { password, ...responUpdateUserPayload } = updateUserPayload;
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

  test("O-1-1  獲取使用者列表API", async () => {
    const { statusCode, body } = await supertest(app)
      .get("/v1/users/admin?page=1")
      .set("Authorization", `Bearer ${token}`);
    expect(statusCode).toBe(200);
    expect(body.data).toEqual(userListPayload);
  });

  test("O-1-2 新增使用者API", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/users/admin")
      .set("Authorization", `Bearer ${token}`)
      .send(creatUserPayload);
    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data).toEqual(responseUserPayload);
    updateUserPayload._id = body.data._id;
    responUpdateUserPayload._id = body.data._id;
  });

  test("O-1-3 修改使用者API", async () => {
    const { statusCode, body } = await supertest(app)
      .patch(`/v1/users/admin/${updateUserPayload._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateUserPayload);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("修改成功");
    expect(body.data).toEqual(expect.objectContaining(responUpdateUserPayload));
  });

  test("O-1-4 刪除使用者API", async () => {
    const { statusCode, body } = await supertest(app)
      .delete(
        `/v1/users/admin/${updateUserPayload._id}/${updateUserPayload.titleNo}`
      )
      .set("Authorization", `Bearer ${token}`);
    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.message).toBe("刪除成功");
    // 呼叫修改API使用相同id，確認是否已被刪除查不到
    const { statusCode: patchStatusCode, body: patchBody } = await supertest(
      app
    )
      .patch(`/v1/users/admin/${updateUserPayload._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateUserPayload);
    expect(patchStatusCode).toBe(400);
    expect(patchBody.message).toBe("無該使用者資料");
  });
});
