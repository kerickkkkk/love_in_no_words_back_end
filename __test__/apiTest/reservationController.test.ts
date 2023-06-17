import supertest from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../../app";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
describe("店員 - 訂位", () => {
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

  const creatUserPayload = {
    name: "註冊店員",
    phone: "0975026598",
    titleNo: 2,
    email: "a468223@gmail.com",
    isDisabled: false,
    password: "12345678",
  };
  const responseUserPayload = {
    isDeleted: false,
    isDisabled: false,
    name: "註冊店員",
    number: "A000000002",
    phone: "0975026598",
    revisedAt: null,
    title: "店員",
    titleNo: 2,
  };
  const seatPayload = {
    tableName: 1,
    seats: 1,
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

  test("新增一張座位", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/seats/admin")
      .set("Authorization", `Bearer ${token}`)
      .send(seatPayload);
    tableNo = body.data.tableNo;
    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.tableName).toBe(seatPayload.tableName);
    expect(body.data.seats).toBe(seatPayload.seats);
  });

  test("新增店員並且登入", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/users/admin")
      .set("Authorization", `Bearer ${token}`)
      .send(creatUserPayload);
    expect(statusCode).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data).toEqual(expect.objectContaining(responseUserPayload));
    const { statusCode: postStatusCode, body: postBody } = await supertest(app)
      .post("/v1/users/login")
      .send(userPayload);
    token = postBody.data.user.token;
    expect(postStatusCode).toBe(200);
  });
  const noReservation = {
    tableNo: 1,
    reservationDate: dayjs().format("YYYY-MM-DD"),
    reservationTime: "上午",
  };
  test("S-1-1 帶位API", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/seats/no-reservation")
      .set("Authorization", `Bearer ${token}`)
      .send(noReservation);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("成功");
    expect(body.data).toEqual(expect.objectContaining(noReservation));
  });
  const getReservationPayload = {
    tables: [
      {
        isWindowSeat: false,
        reservation: expect.objectContaining({
          reservationDate: dayjs().format("YYYY-MM-DD"),
          reservationTime: "上午",
        }),
        seats: 1,
        status: "使用中",
        tableName: 1,
        tableNo: 1,
      },
    ],
  };
  test("S-1-2 查詢座位", async () => {
    const { statusCode, body } = await supertest(app)
      .get(
        `/v1/seats/reservation?reservationDate=${encodeURIComponent(
          noReservation.reservationDate
        )}&reservationTime=${encodeURIComponent(
          noReservation.reservationTime
        )}&status=${encodeURIComponent("使用中")}`
      )
      .set("Authorization", `Bearer ${token}`);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("成功");
    expect(body.data).toEqual(expect.objectContaining(getReservationPayload));
  });
  const creatReservation = {
    tableNo: 1,
    reservationDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    reservationTime: "下午",
    name: "文天祥",
    phone: "0912345678",
  };

  test("S-1-3 新增訂位API", async () => {
    const { statusCode, body } = await supertest(app)
      .post("/v1/seats/reservation")
      .set("Authorization", `Bearer ${token}`)
      .send(creatReservation);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("成功");
    expect(body.data).toEqual(expect.objectContaining(creatReservation));
  });
  let patchReservationId = "";
  const patchReservation = {
    reservationDate: dayjs().add(2, "day").format("YYYY-MM-DD"),
    reservationTime: "下午",
    name: "文天祥",
    phone: "0912345678",
    status: "已預約",
  };
  test("獲取訂位的id", async () => {
    const { statusCode, body } = await supertest(app)
      .get(
        `/v1/seats/reservation?reservationDate=${encodeURIComponent(
          creatReservation.reservationDate
        )}&reservationTime=${encodeURIComponent(
          creatReservation.reservationTime
        )}&status=${encodeURIComponent("已預約")}`
      )
      .set("Authorization", `Bearer ${token}`);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("成功");
    patchReservationId = body.data.tables[0].reservation.reservationId;
  });
  const patchReservationload = {
    reservationDate: dayjs().add(2, "day").format("YYYY-MM-DD"),
    reservationTime: "下午",
    name: "文天祥",
    phone: "0912345678",
    seats: 1,
    tableNo: 1,
  };
  test("S-1-4 修改訂位API", async () => {
    const { statusCode, body } = await supertest(app)
      .patch(`/v1/seats/reservation/${patchReservationId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(patchReservation);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("成功");
    expect(body.data).toEqual(patchReservationload);
  });

  test("S-1-5 取消訂位API", async () => {
    const { statusCode, body } = await supertest(app)
      .delete(`/v1/seats/reservation/${patchReservationId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(statusCode).toBe(200);
    expect(body.message).toBe("預約取消成功");
    // 呼叫修改訂位API確認該訂位ID已不存在
    const { statusCode: checkStatusCode, body: checkBody } = await supertest(
      app
    )
      .patch(`/v1/seats/reservation/${patchReservationId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(patchReservation);
    expect(checkStatusCode).toBe(400);
    expect(checkBody.message).toBe("無該訂位ID");
  });
});
