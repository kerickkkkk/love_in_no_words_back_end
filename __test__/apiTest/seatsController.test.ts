import supertest from 'supertest'
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from '../../app'

describe('店長 - 座位', () => {
    beforeAll(async () => {
        const mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoose.connection.close();
    });
    let token = ''
    let tableNo = ''
    const userSignUpPayload = {
        "name": "我是店長",
        "phone": "0999999999",
        "email": "test@test.com",
        "password": "edvfhaf1234da",
        "confirmPassword": "edvfhaf1234da",
        "isDisabled": false
    }
    const userPayload =
    {
        "phone": "0999999999",
        "password": "edvfhaf1234da"
    }
    const seatPayload = {
        "tableName": 1,
        "seats": 1
    }
    const updateSeatPayload = {
        "tableName": 2,
        "seats": 2,
        "isWindowSeat": true,
        "isDisabled": false
    }
    test("sign_up", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/users/sign_up')
            .send(userSignUpPayload)
        token = body.data.user.token
        expect(statusCode).toBe(200)

    })

    test("login", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/users/login')
            .send(userPayload)
        token = body.data.user.token
        expect(statusCode).toBe(200)

    })

    test("O-2-1 查詢座位", async () => {
        const { statusCode, body } = await supertest(app)
            .get('/v1/seats/admin')
            .set('Authorization', `Bearer ${token}`)
        expect(statusCode).toBe(200)
        expect(body.data).toEqual([])
    })

    test("O-4-2 新增 優惠活動", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/seats/admin')
            .set('Authorization', `Bearer ${token}`)
            .send(seatPayload)
        tableNo = body.data.tableNo
        expect(statusCode).toBe(200)
        expect(body.status).toBe('OK')
        expect(body.data.tableName).toBe(seatPayload.tableName)
        expect(body.data.seats).toBe(seatPayload.seats)
    })

    test("O-4-3 修改 優惠活動", async () => {
        const { statusCode, body } = await supertest(app)
            .patch(`/v1/seats/admin/${tableNo}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateSeatPayload)
        expect(statusCode).toBe(200)
        expect(body.message).toBe('座位修改成功')
        expect(body.data.tableName).toBe(updateSeatPayload.tableName)
        expect(body.data.seats).toBe(updateSeatPayload.seats)
    })

    test("O-4-4 刪除 優惠活動", async () => {
        const { statusCode, body } = await supertest(app)
            .delete(`/v1/seats/admin/${tableNo}`)
            .set('Authorization', `Bearer ${token}`)
        expect(statusCode).toBe(200)
        expect(body.status).toBe('OK')
        expect(body.data.tableName).toBe(updateSeatPayload.tableName)
    })
})

