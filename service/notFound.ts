import { Request, Response } from 'express';

const notFound = (req:Request , res:Response) => {
    res.status(404).json({
      status: 'error',
      message: "無此路由資訊",
    });
}

export default notFound