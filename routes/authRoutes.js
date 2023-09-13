import express from 'express'
const router = express.Router()

import rateLimiter from 'express-rate-limit'
const apiLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 15 minutes
  max: 1,
  message: 'Too many requests from this IP, please try again after 15 minutes',
})

import { register, login, updateUser, closePopup } from '../controllers/authController.js'
import authenticateUser from '../middleware/auth.js'
router.route('/register').post( register)
router.route('/login').post(login)
router.route('/updateUser').patch(authenticateUser, updateUser)
router.route('/popup').post(closePopup)

export default router
