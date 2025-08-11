const mongoose = require('mongoose');

const counselingRecordSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionDate: {
    type: Date,
    required: true
  },
  sessionType: {
    type: String,
    enum: ['individual', 'group', 'emergency'],
    required: true
  },
  mainIssues: [{
    type: String,
    enum: ['stress', 'anxiety', 'depression', 'workplace-conflict', 'work-life-balance', 'other']
  }],
  sessionNotes: {
    type: String,
    required: true,
    maxlength: 2000
  },
  recommendations: {
    type: String,
    maxlength: 1000
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  nextAppointmentDate: {
    type: Date
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CounselingRecord', counselingRecordSchema);