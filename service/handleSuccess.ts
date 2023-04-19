import { Response } from 'express';

const handleSuccess = (res: Response, data: any) => {
    res.status(200).send({
        success: true,
        data
    })
}

export default handleSuccess