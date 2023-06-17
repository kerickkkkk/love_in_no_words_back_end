import linebotController from "../controller/linebotController";
import express from "express";
import { middleware } from "@line/bot-sdk"
import dotenv from 'dotenv'
dotenv.config();

const router = express.Router();

const config: any = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

if (process.env.NODE_ENV !== 'test') {
    router.post("/", middleware(config), linebotController.webhook);
}

export default router;
