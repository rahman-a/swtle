// @ts-nocheck
import fs from 'fs'
import path from 'path'
import { DateTime } from 'luxon'
import cron from 'node-cron'
import mongoose from 'mongoose'
import handlebars from 'handlebars'
import puppeteer from 'puppeteer'
import stripe from '../config/stripe.js'
import Report from '../models/reports.model.js'
import Operation from '../models/operations.model.js'
import User from '../models/users.model.js'
import Company from '../models/Company.model.js'
import Notification from '../models/notifications.model.js'
import { takeAction } from '../config/takeAction.js'
import { code } from '../config/code.js'

export const createReport = async (req, res, next) => {
  const { operation } = req.body

  try {
    const isFound = await Report.findOne({ operation })
    if (isFound) {
      res.status(400)
      throw new Error(req.t('report_already_exist'))
    }
    const targetedOperation = await Operation.findById(operation)

    if (!targetedOperation) {
      res.status(404)
      throw new Error(req.t('operation_not_exist'))
    }

    const newReport = {
      operation: targetedOperation._id,
      currency: targetedOperation.currency,
      credit:
        targetedOperation.initiator.type === 'credit'
          ? targetedOperation.initiator.value
          : targetedOperation.peer.value,
      debt:
        targetedOperation.initiator.type === 'debt'
          ? targetedOperation.initiator.value
          : targetedOperation.peer.value,
    }

    if (targetedOperation.dueDate) {
      newReport.dueDate = targetedOperation.dueDate
    }

    const report = new Report(newReport)
    await report.save()

    res.status(201).send({
      success: true,
      code: 201,
      message: req.t('report_created'),
    })
  } catch (error) {
    next(error)
  }
}

export const listAllMemberReports = async (req, res, next) => {
  const {
    code,
    name,
    type,
    value,
    currency,
    isActive,
    dueDate,
    notDue,
    page,
    skip,
  } = req.query
  console.log('List all member reports')
  const { employeeId } = req.params
  const manager = req.user
  try {
    const userId = employeeId
      ? mongoose.Types.ObjectId(employeeId)
      : manager._id
    if (employeeId) {
      if (!manager.company.isManager) {
        res.status(404)
        throw new Error(req.t('not_authorized_to_handle_request'))
      }
      const company = await Company.findOne({
        manager: manager._id,
        'employees.employee': employeeId,
      })
      if (!company) {
        res.status(404)
        throw new Error(req.t('employee_not_found'))
      }
    }
    let searchFilter = {
      $or: [
        { 'operation.initiator._id': userId },
        { 'operation.peer._id': userId },
      ],

      dueDate: { $ne: null },
      isActive: true,
    }

    let dueDateFilter = { createdAt: -1 }

    if (code) {
      searchFilter = {
        ...searchFilter,
        _id: mongoose.Types.ObjectId(code),
      }
    }

    if (type) {
      searchFilter = {
        ...searchFilter,
        $or: [
          {
            'operation.peer.type': type,
            'operation.peer._id': { $ne: userId },
            'operation.initiator._id': userId,
          },
          {
            'operation.initiator.type': type,
            'operation.initiator._id': { $ne: userId },
            'operation.peer._id': userId,
          },
        ],
      }
    }

    if (notDue) {
      searchFilter = {
        ...searchFilter,
        dueDate: { $eq: null },
      }
    }

    if (dueDate) {
      dueDateFilter = {
        dueDate: parseInt(dueDate),
      }
    }

    if (isActive) {
      searchFilter = {
        ...searchFilter,
        isActive: false,
      }
      dueDateFilter = {
        paymentDate: -1,
      }
    }

    if (name) {
      searchFilter = {
        ...searchFilter,
        $or: [
          {
            'operation.peer.fullNameInEnglish': { $regex: name, $options: 'i' },
            'operation.initiator._id': userId,
          },
          {
            'operation.initiator.fullNameInEnglish': {
              $regex: name,
              $options: 'i',
            },
            'operation.peer._id': userId,
          },
          {
            'operation.peer.fullNameInArabic': { $regex: name, $options: 'i' },
            'operation.initiator._id': userId,
          },
          {
            'operation.initiator.fullNameInArabic': {
              $regex: name,
              $options: 'i',
            },
            'operation.peer._id': userId,
          },
        ],
      }
    }

    if (currency) {
      searchFilter = {
        ...searchFilter,
        'currency.abbr': currency,
      }
    }

    if (value) {
      const values = value.split(':')
      if (values.length === 2) {
        searchFilter = {
          ...searchFilter,
          $or: [
            {
              credit: {
                $gte: parseInt(values[0]),
                $lte: parseInt(values[1]),
              },
            },
            {
              debt: {
                $gte: parseInt(values[0]),
                $lte: parseInt(values[1]),
              },
            },
          ],
        }
      } else {
        searchFilter = {
          ...searchFilter,
          $or: [{ credit: parseInt(values[0]) }, { debt: parseInt(values[0]) }],
        }
      }
    }
    const aggregateOptions = [
      // JOIN CURRENCY COLLECTION
      {
        $lookup: {
          from: 'currencies',
          localField: 'currency',
          foreignField: '_id',
          as: 'currency',
        },
      },

      {
        $lookup: {
          from: 'operations',
          let: { operationId: '$operation', reportId: '$_id' },
          pipeline: [
            {
              $addFields: {
                reportId: { $toObjectId: '$$reportId' },
              },
            },
            {
              $match: { $expr: { $eq: ['$_id', '$$operationId'] } },
            },
            {
              $lookup: {
                from: 'users',
                let: {
                  userId: '$initiator.user',
                  type: '$initiator.type',
                  reportId: '$reportId',
                },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
                  {
                    $lookup: {
                      from: 'companies',
                      localField: 'company.data',
                      foreignField: '_id',
                      as: 'company.data',

                      pipeline: [
                        {
                          $project: {
                            name: 1,
                          },
                        },
                      ],
                    },
                  },
                  {
                    $unwind: {
                      path: '$company.data',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      fullNameInEnglish: 1,
                      fullNameInArabic: 1,
                      color: '$colorCode.code',
                      company: 1,
                      avatar: 1,
                      isEmployee: 1,
                      type: '$$type',
                      delayedFine: {
                        $filter: {
                          input: '$delayedFine',
                          as: 'fine',
                          limit: 1,
                          cond: {
                            $eq: ['$$fine.report', '$$reportId'],
                          },
                        },
                      },
                    },
                  },
                  {
                    $unwind: {
                      path: '$delayedFine',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                ],
                as: 'initiator',
              },
            },
            {
              $lookup: {
                from: 'users',
                let: {
                  userId: '$peer.user',
                  type: '$peer.type',
                  reportId: '$reportId',
                },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
                  {
                    $lookup: {
                      from: 'companies',
                      localField: 'company.data',
                      foreignField: '_id',
                      as: 'company.data',

                      pipeline: [
                        {
                          $project: {
                            name: 1,
                          },
                        },
                      ],
                    },
                  },
                  {
                    $unwind: {
                      path: '$company.data',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      fullNameInEnglish: 1,
                      fullNameInArabic: 1,
                      color: '$colorCode.code',
                      company: 1,
                      avatar: 1,
                      isEmployee: 1,
                      type: '$$type',
                      delayedFine: {
                        $filter: {
                          input: '$delayedFine',
                          as: 'fine',
                          limit: 1,
                          cond: {
                            $eq: ['$$fine.report', '$$reportId'],
                          },
                        },
                      },
                    },
                  },
                  {
                    $unwind: {
                      path: '$delayedFine',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                ],
                as: 'peer',
              },
            },
            {
              $unwind: '$initiator',
            },
            {
              $unwind: '$peer',
            },
            {
              $project: {
                'initiator._id': 1,
                'initiator.fullNameInEnglish': 1,
                'initiator.fullNameInArabic': 1,
                'initiator.color': 1,
                'initiator.avatar': 1,
                'initiator.type': 1,
                'initiator.company': 1,
                'initiator.isEmployee': 1,
                'initiator.delayedFine': 1,
                'peer._id': 1,
                'peer.fullNameInEnglish': 1,
                'peer.fullNameInArabic': 1,
                'peer.company': 1,
                'peer.isEmployee': 1,
                'peer.color': 1,
                'peer.avatar': 1,
                'peer.type': 1,
                'peer.delayedFine': 1,
                note: 1,
              },
            },
          ],

          as: 'operation',
        },
      },
      {
        $unwind: '$currency',
      },
      {
        $unwind: '$operation',
      },
      {
        $match: { ...searchFilter },
      },
    ]

    const reports = await Report.aggregate([
      ...aggregateOptions,
      { $sort: dueDateFilter },
      { $skip: parseInt(skip) || 0 },
      { $limit: parseInt(page) || 5 },
    ])

    const documentCount = await Report.aggregate([
      ...aggregateOptions,
      { $count: 'document_count' },
    ])

    let count = 0

    if (documentCount[0]) {
      count = documentCount[0]['document_count']
    }

    if (reports.length === 0) {
      res.status(404)
      throw new Error(req.t('no_reports_found'))
    }

    res.send({
      success: true,
      code: 200,
      count,
      reports,
    })
  } catch (error) {
    next(error)
  }
}

export const updateReportValues = async (req, res, next) => {
  const { id } = req.params
  const updatedValue = req.query
  try {
    const report = await Report.findById(id)
    if (!report) {
      res.status(404)
      throw new Error(req.t('no_report_found'))
    }
    const allowedProps = ['credit', 'debt', 'dueDate']

    for (let value in updatedValue) {
      if (allowedProps.includes(value)) {
        if (value === 'credit' || value === 'debt') {
          report[value] = parseInt(updatedValue[value])
        } else {
          report[value] = updatedValue[value]
        }
      } else {
        res.status(400)
        throw new Error(req.t('value_not_recognized', { value }))
      }
    }

    const savedReport = await report.save()
    const populatedReport = await Report.findById(savedReport._id)
      .populate({
        path: 'operation',
        populate: {
          path: 'initiator',
          populate: {
            path: 'user',
            select: 'fullNameInEnglish fullNameInArabic type code',
          },
        },
      })
      .populate({
        path: 'operation',
        populate: {
          path: 'peer',
          populate: {
            path: 'user',
            select: 'fullNameInEnglish fullNameInArabic type code',
          },
        },
      })
      .populate('currency', 'name abbr image')

    res.json({
      success: true,
      code: 200,
      report: populatedReport,
      message: req.t('report_updated'),
    })
  } catch (error) {
    next(error)
  }
}

export const sentStripePublishableKey = async (req, res, next) => {
  console.log('key: ', process.env.STRIPE_PUBLISHABLE_KEY)
  try {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      res.status(404)
      throw new Error(req.t('stripe_publishable_key_not_found'))
    }
    res.send({
      success: true,
      code: 200,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    })
  } catch (error) {
    next(error)
  }
}
export const createFineIntent = async (req, res, next) => {
  const { reportId } = req.body
  try {
    if (!reportId) {
      res.status(400)
      throw new Error(req.t('report_id_required'))
    }
    const fine = req.user.delayedFine.find(
      (fine) => fine.report.toString() === reportId
    )
    if (!fine) {
      res.status(404)
      throw new Error(req.t('no_fine_found'))
    }
    const report = await Report.findById(reportId).populate('currency', 'abbr')
    if (!report) {
      res.status(404)
      throw new Error(req.t('no_report_found'))
    }
    const fineIntent = await stripe.paymentIntents.create({
      currency: report.currency.abbr.toLocaleLowerCase(),
      amount: Math.round(fine.amount * 100),
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: req.user.emails.find((email) => email.isPrimary).email,
      description: 'A delayed Fine payment',
    })

    res.send({
      success: true,
      code: 200,
      clientSecret: fineIntent.client_secret,
    })
  } catch (error) {
    next(error)
  }
}
// payment id - report id - paidBy
export const finalizeFinePayment = async (req, res, next) => {
  const { paymentId, reportId, paidBy } = req.body
  const lang = req.headers['accept-language']

  try {
    if (!paymentId) {
      res.status(400)
      throw new Error(req.t('payment_id_required'))
    }
    if (!reportId) {
      res.status(400)
      throw new Error(req.t('report_id_required'))
    }
    const user = await User.findById(req.user._id)
    const paymentDate = new Date()
    const delayedFine = user.delayedFine.map((fine) => {
      if (fine.report.toString() === reportId) {
        fine.paymentId = paymentId
        fine.paidBy = paidBy
        fine.paidAt = paymentDate
      }
      return fine
    })

    let colorCode = user.colorCode

    const report = await Report.findById(reportId)
    if (Boolean(report.paymentDate)) {
      report.isActive = false
      colorCode.state = user.colorCode.state.filter(
        (st) => st.report?.toString() !== report._id.toString()
      )
      const waitingPeriod = DateTime.now()
        .setZone('Asia/Dubai')
        .plus({ months: 1 })
        .toISO()
      report.waitingForClear = waitingPeriod
      await user.update({ delayedFine, colorCode })
      await takeAction(
        user._id,
        'yellow',
        'doneExpiredPayment',
        report._id,
        lang
      )
    }
    const updatedReport = await report.save()
    !Boolean(updatedReport.paymentDate) && (await user.update({ delayedFine }))
    res.send({
      success: true,
      code: 200,
      paidAt: paymentDate,
      isTransactionActive: Boolean(updatedReport.isActive),
      message: req.t('fine_payment_success'),
    })
  } catch (error) {
    next(error)
  }
}

export const closeReportHandler = async (req, res, next) => {
  const { id } = req.params
  const lang = req.headers['accept-language']

  try {
    const report = await Report.findById(id)
    if (!report) {
      res.status(404)
      throw new Error(req.t('no_report_found'))
    }
    if (!report.isActive) {
      res.status(400)
      throw new Error(req.t('"report_already_closed"'))
    }
    const operation = await Operation.findById(report.operation)
    const userId =
      operation.initiator.type === 'debt'
        ? operation.initiator.user
        : operation.peer.user
    const debtor = await User.findById(userId)
    if (!debtor) {
      res.status(404)
      throw new Error(req.t('debtor_may_deleted'))
    }

    if (debtor._id.toString() === req.user._id.toString()) {
      res.status(404)
      throw new Error(req.t('must_be_credit_to_close_report'))
    }

    const paymentDate = new Date()

    const color = debtor.colorCode.code.trim().toLocaleLowerCase()

    if (color === code['green'].toLocaleLowerCase()) {
      report.isActive = false
      report.paymentDate = paymentDate
      await report.save()
      res.send({
        success: true,
        code: 200,
        paidAt: paymentDate,
        message: req.t('report_closed'),
      })

      return
    }

    if (color === code['yellow'].toLocaleLowerCase()) {
      debtor.colorCode.state = debtor.colorCode.state.filter(
        (st) => st.report?.toString() !== report._id.toString()
      )
      await debtor.save()
      report.isActive = false
      report.paymentDate = paymentDate
      await report.save()

      await takeAction(debtor._id, 'green', 'doneLatePayment', report._id)
      res.send({
        success: true,
        code: 200,
        paidAt: paymentDate,
        message: req.t('report_closed'),
      })
      return
    }

    if (color === code['red'].toLocaleLowerCase()) {
      const isFinePaid = debtor.delayedFine.find(
        (fine) => fine.report.toString() === report._id.toString()
      ).paidAt
      if (!Boolean(isFinePaid)) {
        report.paymentDate = paymentDate
        await report.save()
        res.send({
          success: true,
          code: 200,
          paidAt: paymentDate,
          fineNotPaid: true,
        })
        return
      }
      debtor.colorCode.state = debtor.colorCode.state.filter(
        (st) => st.report?.toString() !== report._id.toString()
      )
      await debtor.save()
      report.isActive = false
      report.paymentDate = paymentDate
      const waitingPeriod = DateTime.now()
        .setZone('Asia/Dubai')
        .plus({ months: 1 })
        .toISO()
      report.waitingForClear = waitingPeriod
      await report.save()

      await takeAction(
        debtor._id,
        'yellow',
        'doneExpiredPayment',
        report._id,
        lang
      )
      res.send({
        success: true,
        code: 200,
        paidAt: paymentDate,
        message: req.t('report_closed'),
      })
      return
    }
  } catch (error) {
    next(error)
  }
}

export const requestDueDateChange = async (req, res, next) => {
  const { id } = req.params
  const { date } = req.body
  const lang = req.headers['accept-language']
  try {
    const report = await Report.findById(id)

    if (!report) {
      res.status(404)
      throw new Error(req.t('no_report_found'))
    }

    const operation = await Operation.findById(report.operation)
    if (!operation) {
      res.status(404)
      throw new Error(req.t('no_operation_connected_to_reports'))
    }

    const creditUser =
      operation.initiator.type === 'credit'
        ? operation.initiator.user
        : operation.peer.user
    if (req.user._id.toString() !== creditUser.toString()) {
      res.status(401)
      throw new Error(req.t('must_be_credit_to_change_date'))
    }

    const debtUser =
      operation.initiator.type === 'debt'
        ? operation.initiator.user
        : operation.peer.user

    const userData = await User.findById(creditUser)

    const notificationData = {
      user: debtUser,
      title: {
        en: `Request Due Date Change`,
        ar: `طلب تغيير تاريخ الإستحقاق`,
      },
      body: {
        en: `${
          userData.fullNameInEnglish
        } change Due Date of report #${id}# to ${new Date(
          date
        ).toDateString()}`,
        ar: `${
          userData.fullNameInArabic
        } طلب تغيير تاريخ الإستحقاق للتقرير بكود #${id}# إلى${new Date(
          date
        ).toDateString()}`,
      },
      report: id,
      payload: {
        date,
        englishName: userData.fullNameInEnglish,
        arabicName: userData.fullNameInArabic,
      },
    }

    const newNotification = new Notification(notificationData)
    await newNotification.save()

    res.send({
      success: true,
      code: 200,
      message: req.t('change_due_date_request_and_wait_approve'),
    })
  } catch (error) {
    next(error)
  }
}

export const approveDueDateChange = async (req, res, next) => {
  const { id } = req.params
  const { date } = req.body
  const lang = req.headers['accept-language']
  try {
    const report = await Report.findById(id)
    if (!report) {
      res.status(404)
      throw new Error(req.t('no_reports_found'))
    }

    const operation = await Operation.findById(report.operation)
    if (!operation) {
      res.status(404)
      throw new Error(req.t('no_operation_connected_to_reports'))
    }

    const debtUser =
      operation.initiator.type === 'debt'
        ? operation.initiator.user
        : operation.peer.user

    if (req.user._id.toString() !== debtUser.toString()) {
      res.status(401)
      throw new Error(req.t('must_be_debt_to_approve_change_date'))
    }

    const creditUser =
      operation.initiator.type === 'credit'
        ? operation.initiator.user
        : operation.peer.user

    const userData = await User.findById(debtUser)

    report.dueDate = new Date(date)
    await report.save()

    const notificationData = {
      user: creditUser,
      title: {
        en: `Approve Due Date Change`,
        ar: `الموافقة على تغيير تاريخ الإستحقاق`,
      },
      body: {
        en: `${userData.fullNameInEnglish} approve the due Date Change of report #${id}#`,
        ar: `تم الموافقة على تغيير تاريخ الإستحقاق من قبل ${userData.fullNameInArabic} للتقرير بكود #${id}#`,
      },
    }

    const newNotification = new Notification(notificationData)
    await newNotification.save()

    res.send({
      success: true,
      code: 200,
      message: req.t('due_date_change_success'),
    })
  } catch (error) {
    next(error)
  }
}

export const listAllReports = async (req, res, next) => {
  const {
    arabicName,
    englishName,
    code,
    value,
    currency,
    dueDate,
    isActive,
    isDue,
    paymentDate,
    skip,
    page,
  } = req.query
  try {
    if (code) {
      const report = await Report.findById(code)
        .populate({
          path: 'operation',
          populate: {
            path: 'initiator',
            populate: {
              path: 'user',
              select: 'fullNameInEnglish fullNameInArabic type code',
            },
          },
        })
        .populate({
          path: 'operation',
          populate: {
            path: 'peer',
            populate: {
              path: 'user',
              select: 'fullNameInEnglish fullNameInArabic type code',
            },
          },
        })
        .populate('currency', 'name abbr image')

      res.send({
        success: true,
        code: 200,
        count: 1,
        reports: [report],
      })

      return
    }

    let searchFilter = {}
    let dueFilter = { createdAt: -1 }

    if (isActive) {
      const active = isActive === 'true'

      if (active) {
        searchFilter = {
          ...searchFilter,
          isActive: true,
        }
      } else {
        searchFilter = {
          ...searchFilter,
          isActive: false,
        }
        dueFilter = { paymentDate: -1 }
      }
    }

    // sort document according to
    //  if operation has due date or not
    if (isDue) {
      const due = isDue === 'true'
      if (due) {
        searchFilter = {
          ...searchFilter,
          dueDate: { $ne: null },
        }
        dueFilter = { dueDate: -1 }
      } else {
        searchFilter = {
          ...searchFilter,
          dueDate: { $eq: null },
        }
      }
    }

    if (paymentDate) {
      const date = new Date(paymentDate)
      date.setDate(date.getDate() + 1)

      searchFilter = {
        ...searchFilter,
        dueDate: {
          $gte: new Date(paymentDate),
          $lte: new Date(date),
        },
      }
    }

    if (arabicName) {
      searchFilter = {
        ...searchFilter,
        $or: [
          {
            'operation.initiator.fullNameInArabic': {
              $regex: arabicName,
              $options: 'i',
            },
          },
          {
            'operation.peer.fullNameInArabic': {
              $regex: arabicName,
              $options: 'i',
            },
          },
        ],
      }
    }
    if (englishName) {
      searchFilter = {
        ...searchFilter,
        $or: [
          {
            'operation.initiator.fullNameInEnglish': {
              $regex: englishName,
              $options: 'i',
            },
          },
          {
            'operation.peer.fullNameInEnglish': {
              $regex: englishName,
              $options: 'i',
            },
          },
        ],
      }
    }
    if (currency) {
      searchFilter = {
        ...searchFilter,
        'currency.abbr': currency,
      }
    }

    if (dueDate) {
      const date = new Date(dueDate)
      date.setDate(date.getDate() + 1)

      searchFilter = {
        ...searchFilter,
        dueDate: {
          $gte: new Date(dueDate),
          $lte: new Date(date),
        },
      }
    }

    if (value) {
      const values = value.split(':')
      if (values.length === 2) {
        searchFilter = {
          ...searchFilter,
          $or: [
            {
              credit: {
                $gte: parseInt(values[0]),
                $lte: parseInt(values[1]),
              },
            },
            {
              debt: {
                $gte: parseInt(values[0]),
                $lte: parseInt(values[1]),
              },
            },
          ],
        }
      } else {
        searchFilter = {
          ...searchFilter,
          $or: [{ credit: parseInt(values[0]) }, { debt: parseInt(values[0]) }],
        }
      }
    }

    const aggregateOptions = [
      // JOIN CURRENCY COLLECTION
      {
        $lookup: {
          from: 'currencies',
          localField: 'currency',
          foreignField: '_id',
          as: 'currency',
        },
      },

      {
        $lookup: {
          from: 'operations',
          let: { operationId: '$operation' },
          pipeline: [
            {
              $match: { $expr: { $eq: ['$_id', '$$operationId'] } },
            },
            {
              $lookup: {
                from: 'users',
                let: { userId: '$initiator.user', type: '$initiator.type' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
                  {
                    $project: {
                      fullNameInEnglish: 1,
                      fullNameInArabic: 1,
                      code: 1,
                      type: '$$type',
                    },
                  },
                ],
                as: 'initiator',
              },
            },
            {
              $lookup: {
                from: 'users',
                let: { userId: '$peer.user', type: '$peer.type' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
                  {
                    $project: {
                      fullNameInEnglish: 1,
                      fullNameInArabic: 1,
                      code: 1,
                      type: '$$type',
                    },
                  },
                ],
                as: 'peer',
              },
            },
            {
              $unwind: '$initiator',
            },
            {
              $unwind: '$peer',
            },
            {
              $project: {
                'initiator._id': 1,
                'initiator.fullNameInEnglish': 1,
                'initiator.fullNameInArabic': 1,
                'initiator.code': 1,
                'initiator.type': 1,
                'peer._id': 1,
                'peer.fullNameInEnglish': 1,
                'peer.fullNameInArabic': 1,
                'peer.code': 1,
                'peer.type': 1,
                note: 1,
                createdAt: 1,
              },
            },
          ],

          as: 'operation',
        },
      },
      {
        $unwind: '$currency',
      },
      {
        $unwind: '$operation',
      },
      {
        $match: { ...searchFilter },
      },
    ]

    const reports = await Report.aggregate([
      ...aggregateOptions,
      { $sort: dueFilter },
      { $skip: parseInt(skip) || 0 },
      { $limit: parseInt(page) || 5 },
    ])

    const documentCount = await Report.aggregate([
      ...aggregateOptions,
      { $count: 'document_count' },
    ])

    let count = 0

    if (documentCount[0]) {
      count = documentCount[0]['document_count']
    }

    if (reports.length === 0) {
      res.status(404)
      throw new Error(req.t('no_reports_found'))
    }

    res.send({
      success: true,
      code: 200,
      count,
      reports,
    })
  } catch (error) {
    next(error)
  }
}
/** required data */
// user_code[admin], peer_code,
// request_type [single_transaction, selected_transactions, full_report],
// transaction_code,
// act_as, transaction_type, isAdmin[admin]
// note
// period:{from, to}
// lang
export const generateReportsForPrinting = async (req, res, next) => {
  const {
    user_code,
    peer_code,
    request_type,
    transaction_code,
    act_as,
    transaction_type,
    period,
    lang,
    isAdmin,
  } = req.body
  try {
    let transactions = []
    const roles = ['manager', 'hr', 'cs']
    if (isAdmin) {
      if (!roles.some((role) => req.user.roles.includes(role))) {
        res.status(401)
        throw new Error('Not authorized to access this request')
      }
      if (!user_code) {
        res.status(400)
        throw new Error('First party code is required')
      }
    }
    if (user_code && !isAdmin) {
      res.status(401)
      throw new Error('Not authorized to access this request')
    }
    const user = await User.findOne({ code: user_code || req.user.code })
    const peer = await User.findOne({ code: peer_code })
    const user_data = structureUserData({ user, request_type, period, lang })
    if (request_type === 'single_transaction') {
      if (!transaction_code) {
        res.status(400)
        throw new Error('Transaction code is required')
      }
      const transaction = await Report.findById(transaction_code)
      const data = await mapDataFromReport({
        user: user._id,
        report: transaction,
        lang,
      })
      if (data.error) {
        res.status(400)
        throw new Error(data.error)
      }
      transactions.push(data)
    }
    if (request_type === 'selected_transactions') {
      const reports = await generateFilteredReports({
        user,
        peer,
        act_as,
        transaction_type,
        period,
      })
      for (const report of reports) {
        const data = await mapDataFromReport({
          user: user._id,
          report,
          lang,
        })
        transactions.push(data)
      }
    }
    if (request_type === 'full_report') {
      const reports = await generateFilteredReports({ user })
      for (const report of reports) {
        const data = await mapDataFromReport({
          user: user._id,
          report,
          lang,
        })
        transactions.push(data)
      }
    }

    if (transactions.length === 0) {
      res.status(404)
      throw new Error('No transactions found')
    }

    res.send({
      success: true,
      code: 200,
      reports: {
        user: user_data,
        transactions,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const generatePDFBuffer = async (req, res, next) => {
  try {
    const { user, transactions } = req.body
    const template = fs.readFileSync(
      path.join(process.cwd(), 'server/src', 'template/report.hbs'),
      'utf-8'
    )
    const reportData = transactions.map((input, idx) => ({
      ...input,
      id: idx + 1,
    }))
    const logoBinary = fs
      .readFileSync(path.join(process.cwd(), 'server', 'uploads/swtle.png'))
      .toString('base64')
    const html = handlebars.compile(template)({
      title: 'Accounts Report',
      transactions: reportData,
      user,
    })
    const browser = await puppeteer.launch({
      headless: true,
    })
    const page = await browser.newPage()
    const headerTemplate = `
    <style>
      html {
        -webkit-print-color-adjust: exact;
      }
      #header {
        padding:0 !important;
      }
      </style>
      <header style="width:100%;margin:0;padding:0;background-color: #1a374d;position: relative">
      <div style="position: absolute;background-color: #dee3f3;width: 800px;height: 35px;right: 0;bottom: -8px;box-shadow: -2px 0px 6px 0px rgb(0 0 0 / 30%)"></div>
      <div style="background-color: #1a374d;position: absolute;width: 235px;height: 58px;left: 0;z-index: 0;clip-path: polygon(0 0, 100% 0, 92% 100%, 0% 100%)"></div>
      <img style="position:relative; width:135px; height:50px; z-index:999; top:5px; left:35px" src="data:image/png;base64,${logoBinary}" alt="logo" />
    </header>
    `
    await page.emulateMediaType('screen')
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '130px',
        bottom: '115px',
      },
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate:
        "<p style='font-size: 10px; margin:0 auto;'>Page <span class='pageNumber'></span> of <span class='totalPages'></span></p>",
    })
    await browser.close()
    res.send({
      success: true,
      code: 200,
      pdf: pdfBuffer,
    })
  } catch (error) {
    next(error)
  }
}

const structureUserData = (payload) => {
  const { user, request_type, period, lang } = payload
  return {
    account_number: user._id,
    account_code: user.code,
    account_holder:
      lang === 'en' ? user.fullNameInEnglish : user.fullNameInArabic,
    printing_date: DateTime.now()
      .setLocale(lang)
      .setZone('Asia/Dubai')
      .toLocaleString(DateTime.DATETIME_MED),
    statement_period:
      request_type === 'selected_transactions' && period
        ? {
            from: DateTime.fromJSDate(new Date(period.from))
              .setLocale(lang)
              .setZone('Asia/Dubai')
              .toLocaleString(DateTime.DATE_MED),
            to: DateTime.fromJSDate(new Date(period.to))
              .setLocale(lang)
              .setZone('Asia/Dubai')
              .toLocaleString(DateTime.DATE_MED),
          }
        : null,
  }
}

const generateFilteredReports = async (payload) => {
  const { user, peer, act_as, transaction_type, period } = payload

  let searchFilter = {
    $or: [
      {
        'operation.initiator.user': user._id,
      },
      {
        'operation.peer.user': user._id,
      },
    ],
  }

  if (peer) {
    searchFilter = {
      ...searchFilter,
      $or: [
        {
          'operation.initiator.user': peer._id,
          'operation.peer.user': user._id,
        },
        {
          'operation.peer.user': peer._id,
          'operation.initiator.user': user._id,
        },
      ],
    }
  }

  if (transaction_type?.length === 1) {
    searchFilter = {
      ...searchFilter,
      isActive: transaction_type.includes('unpaid'),
    }
  }

  if (act_as?.length && peer) {
    searchFilter = {
      ...searchFilter,
      $and: [
        {
          $or: [
            {
              $and: [
                { 'operation.initiator.user': user._id },
                {
                  'operation.initiator.type': { $in: act_as },
                },
              ],
            },
            {
              $and: [
                { 'operation.peer.user': user._id },
                {
                  'operation.peer.type': { $in: act_as },
                },
              ],
            },
          ],
        },
        {
          $or: [
            {
              'operation.initiator.user': peer._id,
              'operation.peer.user': user._id,
            },
            {
              'operation.peer.user': peer._id,
              'operation.initiator.user': user._id,
            },
          ],
        },
      ],
    }
  }

  if (act_as?.length && !peer) {
    searchFilter = {
      ...searchFilter,
      $or: [
        {
          $and: [
            { 'operation.initiator.user': user._id },
            {
              'operation.initiator.type': { $in: act_as },
            },
          ],
        },
        {
          $and: [
            { 'operation.peer.user': user._id },
            {
              'operation.peer.type': { $in: act_as },
            },
          ],
        },
      ],
    }
  }

  if (period?.from || period?.to) {
    const from = period.from ? { $gte: new Date(period.from) } : {}
    const to = period.to ? { $lte: new Date(period.to) } : {}
    searchFilter = {
      ...searchFilter,
      createdAt: {
        ...from,
        ...to,
      },
    }
  }

  const reports = await Report.aggregate([
    {
      $lookup: {
        from: 'operations',
        let: { operation_id: '$operation' },
        pipeline: [
          {
            $match: { $expr: { $eq: ['$_id', '$$operation_id'] } },
          },
          {
            $project: {
              initiator: 1,
              peer: 1,
            },
          },
        ],
        as: 'operation',
      },
    },
    {
      $unwind: '$operation',
    },
    {
      $match: { ...searchFilter },
    },
  ])

  return reports
}
//  payload = {user, report, note, lang}
const mapDataFromReport = async (payload) => {
  const { user, report, lang, peer_id } = payload
  const operation = await Operation.findOne({ _id: report.operation }).populate(
    'currency',
    'name abbr'
  )
  if (
    user.toString() !== operation.peer.user.toString() &&
    user.toString() !== operation.initiator.user.toString()
  ) {
    return {
      error: 'You are not allowed to view this report',
    }
  }
  const peerId =
    operation.initiator.user.toString() === user.toString()
      ? operation.peer.user
      : operation.initiator.user
  const peer = await User.findById(peerId)
  const act_as =
    operation.initiator.user.toString() === user.toString()
      ? operation.initiator
      : operation.peer
  if (peer_id) {
    if (peerId.toString() !== peer_id.toString()) return null
  }
  return {
    _id: report._id,
    report_date: DateTime.fromJSDate(new Date(report.createdAt)).toLocaleString(
      DateTime.DATE_MED
    ),
    debt:
      act_as.type === 'debt' ? (report.debt ? report.debt : report.credit) : 0,
    credit:
      act_as.type === 'credit'
        ? report.credit
          ? report.credit
          : report.debt
        : 0,
    beneficiary: lang === 'en' ? peer.fullNameInEnglish : peer.fullNameInArabic,
    currency: operation.currency.name,
    isPaid: !report.isActive,
    due_date: report.dueDate
      ? DateTime.fromJSDate(new Date(report.dueDate)).toLocaleString(
          DateTime.DATE_MED
        )
      : null,
  }
}

const scanReportsDueDate = async () => {
  let date = DateTime.now()
    .setZone('Africa/Cairo')
    .toLocaleString(DateTime.DATETIME_MED)
  console.log(`Start Reports Scanning.... at ${date}`)
  try {
    const reports = await Report.find({
      isActive: true,
      dueDate: { $exists: true, $lte: new Date() },
    })

    if (reports.length) {
      const now = DateTime.now().setZone('Asia/Dubai').ts

      for (const report of reports) {
        const dueDateObject = new Date(report.dueDate)
        const dueDate =
          DateTime.fromJSDate(dueDateObject).setZone('Asia/Dubai').ts
        const weekAfterDueDate = DateTime.fromJSDate(dueDateObject)
          .setZone('Asia/Dubai')
          .plus({ days: 7 }).ts

        const twoDaysBeforeDueDate = DateTime.fromJSDate(dueDateObject)
          .setZone('Asia/Dubai')
          .minus({ days: 2 }).ts

        if (now > twoDaysBeforeDueDate && now < dueDate && report.isActive) {
          // send reminder email of payment
          const operation = await Operation.findById(report.operation)
          const userId =
            operation.initiator.type === 'debt'
              ? operation.initiator.user
              : operation.peer.user
          const debtor = await User.findById(userId)
          if (debtor) {
            const info = {
              name: debtor.fullNameInEnglish,
              email: debtor.emails.find((email) => email.isPrimary === true)
                .email,
              date: dueDateObject.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
              report: report._id,
            }
            await sendEmail(info, 'debt')
          }
        }

        if (now > dueDate && report.isActive) {
          const operation = await Operation.findById(report.operation)
          const userId =
            operation.initiator.type === 'debt'
              ? operation.initiator.user
              : operation.peer.user
          const debtor = await User.findById(userId)
          if (debtor) {
            if (now <= weekAfterDueDate) {
              const isStateFound = debtor.colorCode.state.find(
                (st) =>
                  st.label.en === 'Late Payment' &&
                  st.report.toString() === report._id.toString()
              )
              !isStateFound &&
                (await takeAction(debtor._id, 'yellow', 'payLate', report._id))
            } else {
              const idx = debtor.colorCode.state.findIndex(
                (st) =>
                  st.label.en === 'Late Payment' &&
                  st.report?.toString() === report._id.toString()
              )
              if (idx !== -1) {
                debtor.colorCode.state.splice(idx, 1)
                await debtor.save()
              }

              const isStateFound = debtor.colorCode.state.find(
                (st) =>
                  st.label.en === 'Expired Payment' &&
                  st.report.toString() === report._id.toString()
              )
              if (!isStateFound) {
                const transactionValue = report.debt
                  ? report.debt
                  : report.credit
                const delayedFine = calculateDelayedFine(
                  transactionValue,
                  report._id
                )
                await takeAction(
                  debtor._id,
                  'red',
                  'payExpired',
                  report._id,
                  delayedFine.amount
                )
                await debtor.updateOne({
                  delayedFine: [...debtor.delayedFine, delayedFine],
                })
              }
            }
          }
        }
      }
    }
    const waitingReports = await Report.find({
      waitingForClear: { $exists: true, $lte: new Date() },
    })
    if (waitingReports.length) {
      const now = DateTime.now().setZone('Asia/Dubai').ts

      for (const report of waitingReports) {
        const dateObject = new Date(report.waitingForClear)
        const waitingTime =
          DateTime.fromJSDate(dateObject).setZone('Asia/Dubai').ts
        if (now >= waitingTime) {
          // unset waitingForClear Field
          report.waitingForClear = undefined
          await report.save()

          // locate debtor user
          const operation = await Operation.findById(report.operation)
          const userId =
            operation.initiator.type === 'debt'
              ? operation.initiator.user
              : operation.peer.user
          const debtor = await User.findById(userId)
          if (debtor) {
            // remove late payment from state
            debtor.colorCode.state = debtor.colorCode.state.filter(
              (st) => st.report?.toString() !== report._id.toString()
            )
            await debtor.save()
            await takeAction(debtor._id, 'green', 'clear', report._id)
          }
        }
      }
    }
    date = DateTime.now()
      .setZone('Africa/Cairo')
      .toLocaleString(DateTime.DATETIME_MED)
    console.log(`Done Reports Scanning!!!! at ${date}`)
  } catch (error) {
    date = DateTime.now()
      .setZone('Africa/Cairo')
      .toLocaleString(DateTime.DATETIME_MED)
    console.error(
      '\x1b[31m',
      `Done Reports Scanning!!!! at ${date} with ERROR: ${error.message}`
    )
  }
}

cron.schedule('0 23 20 * * *', scanReportsDueDate, {
  timezone: 'Africa/Cairo',
})

const calculateDelayedFine = (amount, reportId) => {
  const delayedFeePercentage = 10
  return {
    amount: (amount * delayedFeePercentage) / 100,
    report: reportId,
    finedAt: new Date(),
    paidAt: null,
  }
}
