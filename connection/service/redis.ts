import { createClient } from 'redis';
import dotenv from 'dotenv'
dotenv.config();
const redisUrl = process.env.REDIS_DATABASE;

const redisClient = createClient({
  url: redisUrl
});

// // 初始先是連一次 和 cache 分開因為有問題
const connectRedis = async () => {
  redisClient.on('error', (err: Error) => console.log(`Redis 錯誤 : ${err}`));
  await redisClient.connect();
  console.log('Redis 連線成功');
};
connectRedis();

export const setCache = async (cacheKey: string, data: any) => {
  try {
    const key = btoa(cacheKey)
    const res = await redisClient.set(key, JSON.stringify(data), { EX: 10 })
    console.log('寫入 redis', cacheKey, res);
  } catch (error) {
    console.log('Redis 有問題');
  }
}

export const checkCacheKeyExist = async (cacheKey: string) => {
  try {
    const key = btoa(cacheKey)
    return await redisClient.get(key)
  } catch (error) {
    console.log('Redis 有問題');
  }
}

export default redisClient;
