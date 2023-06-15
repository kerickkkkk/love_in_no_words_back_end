import supertest from 'supertest'
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from '../../app'

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

    test("sign_up", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/users/sign_up')
            .send(userSignUpPayload)
        console.log(body);

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

    // 建立商品分類

    let productsTypeA = ''
    const productsTypePayload = {
        "productsTypeName": "甜點"
    }
    test(`O-3-7 新增 商品分類: ${productsTypePayload.productsTypeName}`, async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/products/admin/dessertcodes')
            .set('Authorization', `Bearer ${token}`)
            .send(productsTypePayload)
        productsTypeA = body.data._id
        expect(statusCode).toBe(200)
        expect(body.status).toBe('OK')
        expect(body.data.productsType).toBe(1)
        expect(body.data.productsTypeName).toBe(productsTypePayload.productsTypeName)
    })
    let productsTypeB = ''
    const productsTypePayload2 = {
        "productsTypeName": "飲料"
    }
    test(`O-3-7 新增 商品分類: ${productsTypePayload2.productsTypeName}`, async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/products/admin/dessertcodes')
            .set('Authorization', `Bearer ${token}`)
            .send(productsTypePayload2)

        productsTypeB = body.data._id
        expect(statusCode).toBe(200)
        expect(body.data.productsType).toBe(2)
        expect(body.data.productsTypeName).toBe(productsTypePayload2.productsTypeName)
    })


    const couponPayload =
    {
        "list": [1, 2],
        "discount": 90
    }

    test("O-6-2 新增 a+b 活動", async () => {
        const { statusCode, body } = await supertest(app)
            .post('/v1/abcoupons/admin')
            .set('Authorization', `Bearer ${token}`)
            .send(couponPayload)
        couponNo = body.data.couponNo
        expect(statusCode).toBe(200)
        expect(body.data.couponNo).toBe('B000000001')
        expect(body.data.productsTypeA).toBe(productsTypeA)
        expect(body.data.productsTypeB).toBe(productsTypeB)
        expect(body.data.discount).toBe(couponPayload.discount)
    })

    test("O-6-1 取得 a+b 活動", async () => {
        const { statusCode, body } = await supertest(app)
            .get('/v1/abcoupons/admin')
            .set('Authorization', `Bearer ${token}`)
        expect(statusCode).toBe(200)
        expect(body.data.list).toContainEqual(
            expect.objectContaining({
                productsTypeA: expect.objectContaining({
                    _id: productsTypeA
                }),
                productsTypeB: expect.objectContaining({
                    _id: productsTypeB
                }),
            })
        )
    })

    test("O-6-3 修改 a+b 活動", async () => {
        const { statusCode, body } = await supertest(app)
            .patch(`/v1/abcoupons/admin/${couponNo}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                discount: 50
            })
        expect(statusCode).toBe(200)
        expect(body.message).toBe("A + B 活動折扣修改成功")
        expect(body.data.discount).toBe(50)
    })

    test("O-6-4 刪除 a+b 活動", async () => {
        const { statusCode, body } = await supertest(app)
            .delete(`/v1/abcoupons/admin/${couponNo}`)
            .set('Authorization', `Bearer ${token}`)
        expect(statusCode).toBe(200)
        expect(body.status).toBe('OK')
        expect(body.data.couponNo).toBe(couponNo)
    })
})

