import express from 'express'
const router = express.Router()
import rateLimiter from 'express-rate-limit'
const apiLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, //5 minutes
  max: 1,
  message: 'Too many requests from this IP, please try again after 15 minutes',
})

import {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  showStats,
  createReply
} from '../controllers/jobsController.js'

router.route('/').post(createJob).get(getAllJobs)
// router.route('/reply').post(createReply)

// remember about :id
router.route('/stats').get(showStats)
router.route('/:id').delete(deleteJob).patch(updateJob)

export default router
