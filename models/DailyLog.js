import mongoose from 'mongoose'

const DailyLogSchema = new mongoose.Schema(
  {
    day: {
        type: Number,
        required: [true, 'Please provide day'],
        maxlength: 50,
      },
    log: {
      type: String,
      required: [true, 'Please provide log'],
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user'],
    }
  },              
  { timestamps: true }
)

export default mongoose.model('DailyLog', DailyLogSchema)