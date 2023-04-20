import { Response } from 'express';

const handleSuccess = (res: Response, msg: String, data: any) => {
    res.status(200).send({
        status: 'OK',
        message: msg,
        data
    })
}

export default handleSuccess