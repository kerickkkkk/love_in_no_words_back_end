import usersController from '../controller/usersController'
import express from 'express';
import { isAuth } from '../middleware/auth';
const router = express.Router();

/* GET users listing. */
router.get('/', usersController.getUsers);
router.delete('/:id',isAuth, usersController.softDeleteUser);
router.post('/sign_up', usersController.signUp);
router.post('/login', usersController.login);
router.post('/reset_password', isAuth, usersController.resetPassword);
router.get('/profile', isAuth, usersController.profile)
router.get('/:id', isAuth, usersController.getUser)
router.patch('/:id', isAuth, usersController.updateUser)

export default router;
