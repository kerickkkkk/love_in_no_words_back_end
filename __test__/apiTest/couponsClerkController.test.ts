import supertest from 'supertest'
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from '../../app'

describe('店員 - 優惠券', () => {
    beforeAll(async () => {
        const mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoose.connection.close();
    });
    let token = ''
    let clerkToken = ''
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

    test("sign_up", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/users/sign_up')
            .send(userSignUpPayload)
        expect(statusCode).toBe(200)
        token = body.data.user.token
    })

    test("login", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/users/login')
            .send(userPayload)
        token = body.data.user.token
        expect(statusCode).toBe(200)

    })

    const couponPayload = {
        "couponName": `九折卷test`,
        "couponCode": `off-test`,
        "discount": 100,
        "isDisabled": false
    }

    test("O-4-2 新增 優惠活動", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/coupons/admin')
            .set('Authorization', `Bearer ${token}`)
            .send(couponPayload)
        expect(statusCode).toBe(200)
        expect(body.data).toMatchObject(couponPayload)
    })

    const couponPayloadDisabled = {
        "couponName": `五折test - 失活`,
        "couponCode": `off-test-50`,
        "discount": 50,
        "isDisabled": true
    }

    test("O-4-2 新增 優惠活動 - 未啟用", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/coupons/admin')
            .set('Authorization', `Bearer ${token}`)
            .send(couponPayloadDisabled)
        expect(statusCode).toBe(200)
        expect(body.data).toMatchObject(couponPayloadDisabled);
    })

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

    test("O-4-1 店員獲取優惠活動列表", async () => {
        const { statusCode, body } = await supertest(app)
            .get('/v1/coupons')
            .set('Authorization', `Bearer ${clerkToken}`)
        expect(statusCode).toBe(200)
        expect(body.data.every((obj: any) => obj.isDisabled === false)).toBe(true)
    })
})

