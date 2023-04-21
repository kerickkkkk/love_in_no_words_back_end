import { Model } from 'mongoose';

// 傳入該 model 前面戴上前綴 總共十碼（含前綴）
export const autoIncrement = async (model: Model<any>, word: string): Promise<string> => {
    const num = await model.countDocuments({});
    let tempNum = 0
    if ( num >= 1 ){
        const lastDoc = await model.findOne({}, {}, { sort: { 'createdAt' : -1 } })
        tempNum = lastDoc.number.slice(1) * 1 + 1        
    }else {
        tempNum = 1
    }
    const index = `${word}${tempNum.toString().padStart(9, '0')}`
    return index;
};