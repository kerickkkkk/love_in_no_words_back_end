import supertest from 'supertest'
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from '../../app'
import { v4 as uuidv4 } from "uuid";

describe('店長 - 優惠券', () => {
    beforeAll(async () => {
        const mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoose.connection.close();
    });
    let token = ''
    let couponNo = ''
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
    const couponPayload = {
        "couponName": `九折卷test-${uuidv4()}`,
        "couponCode": `off-test${uuidv4()}`,
        "discount": 100,
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

    test("O-4-1 取得 優惠活動 - 初始", async () => {
        const { statusCode, body } = await supertest(app)
            .get('/v1/coupons/admin')
            .set('Authorization', `Bearer ${token}`)
        expect(statusCode).toBe(200)
        expect(body.data).toEqual([])
    })

    test("O-4-2 新增 優惠活動", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/coupons/admin')
            .set('Authorization', `Bearer ${token}`)
            .send(couponPayload)
        couponNo = body.data.couponNo
        expect(statusCode).toBe(200)
        expect(body.status).toBe('OK')
        expect(body.data.couponName).toBe(couponPayload.couponName)
        expect(body.data.couponCode).toBe(couponPayload.couponCode)
        expect(body.data.discount).toBe(couponPayload.discount)
        expect(body.data.isDisabled).toBe(couponPayload.isDisabled)
    })

    test("O-4-3 修改 優惠活動", async () => {
        const { statusCode, body } = await supertest(app)
            .patch(`/v1/coupons/admin/${couponNo}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                ...couponPayload,
                discount: 10
            })
        expect(statusCode).toBe(200)
        expect(body.message).toBe('優惠碼活動修改成功')
        expect(body.data.discount).toBe(10)
    })

    test("O-4-4 刪除 優惠活動", async () => {
        const { statusCode, body } = await supertest(app)
            .delete(`/v1/coupons/admin/${couponNo}`)
            .set('Authorization', `Bearer ${token}`)
        expect(statusCode).toBe(200)
        expect(body.status).toBe('OK')
        expect(body.data.couponNo).toBe(couponNo)
    })
})

