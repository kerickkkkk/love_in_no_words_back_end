import { Model } from "mongoose";

// 傳入該 model 前面戴上前綴 總共十碼（含前綴）
export const autoIncrement = async (
  model: Model<any>,
  word: string
): Promise<string> => {
  // 去collection尋找符合number開頭為${word}的筆數
  const num = await model.countDocuments({ number: { $regex: `${word}.*` } });
  let tempNum = 0;
  if (num >= 1) {
    tempNum = num + 1;
  } else {
    tempNum = 1;
  }

  // 把數字補到9位數
  const index = `${word}${tempNum.toString().padStart(9, "0")}`;
  return index;
};
export const autoIncrementNumber = async (
  model: Model<any>,
  columnName = ""
): Promise<number> => {
  const lastObj = (await model.findOne({ isDisabled: false }).sort({ createdAt: -1 }))
  const index = lastObj !== null ? lastObj[columnName] + 1 : 1
  return index
};