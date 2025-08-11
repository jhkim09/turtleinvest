const express = require('express');
const CounselingRecord = require('../models/CounselingRecord');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', [auth, authorize('admin', 'counselor')], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const totalAppointments = await Appointment.countDocuments(dateFilter);
    const completedAppointments = await Appointment.countDocuments({
      ...dateFilter,
      status: 'completed'
    });
    const cancelledAppointments = await Appointment.countDocuments({
      ...dateFilter,
      status: 'cancelled'
    });

    const departmentStats = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeInfo'
        }
      },
      { $unwind: '$employeeInfo' },
      {
        $group: {
          _id: '$employeeInfo.department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const monthlyTrend = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          appointments: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const issueStats = await CounselingRecord.aggregate([
      { $match: dateFilter },
      { $unwind: '$mainIssues' },
      {
        $group: {
          _id: '$mainIssues',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      summary: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0
      },
      departmentStats,
      monthlyTrend,
      issueStats
    });
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/counselor-performance', [auth, authorize('admin')], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const counselorStats = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'counselor',
          foreignField: '_id',
          as: 'counselorInfo'
        }
      },
      { $unwind: '$counselorInfo' },
      {
        $group: {
          _id: '$counselor',
          counselorName: { $first: '$counselorInfo.name' },
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalAppointments', 0] },
              { $multiply: [{ $divide: ['$completedAppointments', '$totalAppointments'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalAppointments: -1 } }
    ]);

    res.json(counselorStats);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/export/appointments', [auth, authorize('admin')], async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const appointments = await Appointment.find(dateFilter)
      .populate('employee', 'name email employeeId department')
      .populate('counselor', 'name email')
      .sort({ scheduledDate: -1 });

    if (format === 'csv') {
      const csvData = appointments.map(apt => ({
        '예약일시': apt.scheduledDate.toISOString(),
        '직원명': apt.employee.name,
        '직원번호': apt.employee.employeeId,
        '부서': apt.employee.department,
        '상담사': apt.counselor.name,
        '상태': apt.status,
        '유형': apt.type,
        '사유': apt.reason
      }));
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=appointments.csv');
      
      const csvHeader = Object.keys(csvData[0] || {}).join(',');
      const csvRows = csvData.map(row => Object.values(row).join(','));
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      return res.send(csvContent);
    }

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;