import { Response } from "express";

const handleSuccess = (res: Response, msg: string, data: any) => {
  if (data == null) {
    res.status(200).send({
      status: "OK",
      message: msg,
    });
  } else {
    res.status(200).send({
      status: "OK",
      message: msg,
      data,
    });
  }
};

export default handleSuccess;
