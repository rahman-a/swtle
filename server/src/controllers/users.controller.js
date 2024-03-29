// @ts-nocheck
import fs from 'fs'
import path from 'path'
import randomstring from 'randomstring'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { DateTime } from 'luxon'
import cron from 'node-cron'
import { v4 as uuidv4 } from 'uuid'
import { generateFromEmail } from 'unique-username-generator'
import { chatClient } from '../config/stream.chat.js'
import User from '../models/users.model.js'
import Notification from '../models/notifications.model.js'
import Company from '../models/Company.model.js'
import Session from '../models/sessions.model.js'
import MutualClients from '../models/mutualClients.js'
import sendSMS from '../sms/send.js'
import sendEmail from '../emails/email.js'
import { takeAction } from '../config/takeAction.js'
import { labels } from '../config/labels.js'

const __dirname = path.join(process.cwd(), 'server/src/controllers')

const documentsInArabic = {
  identity: 'بطاقة الهوية',
  passport: 'جواز السفر',
  residential: 'بطاقة الأقامة',
}

// check if username, email, phone exist
export const checkIfExist = async (req, res, next) => {
  const { username, emails, phones, name, email, phone } = req.body
  try {
    if (name) {
      const isNameFound = await Company.findOne({ name })
      if (isNameFound) {
        res.status(400)
        throw new Error(req.t('name_already_found', { name }))
      }
    }
    if (email) {
      const isEmailFound = await Company.findOne({ email })
      if (isEmailFound) {
        res.status(400)
        throw new Error(req.t('email_already_found', { email }))
      }
    }
    if (phone) {
      const isPhoneFound = await Company.findOne({ phone })
      if (isPhoneFound) {
        res.status(400)
        throw new Error(req.t('phone_already_found', { phone }))
      }
    }
    if (username) {
      const isUsernameFound = await User.findOne({ username })
      if (isUsernameFound) {
        res.status(400)
        throw new Error(req.t('username_already_found'))
      }
    }
    if (emails && emails.length) {
      for (const email of emails) {
        const isFound = await User.findOne({ 'emails.email': email.email })
        if (isFound) {
          res.status(400)
          throw new Error(req.t('email-already-exist', { email: email.email }))
        }
      }
    }
    if (phones && phones.length) {
      for (const phone of phones) {
        const isPhoneFound = await User.findOne({
          'insidePhones.phone': phone.phone,
        })
        if (isPhoneFound) {
          res.status(400)
          throw new Error(req.t('phone_already_exist', { phone: phone.phone }))
        }
      }
    }
    res.send({
      code: 200,
      success: true,
    })
  } catch (error) {
    next(error)
  }
}

export const registerNewUser = async (req, res, next) => {
  const { country, emails, insidePhones, accountType } = req.body
  const user = req.body
  try {
    user.country && (user.country = JSON.parse(country))
    user.emails = JSON.parse(emails)
    user.insidePhones = JSON.parse(insidePhones)
    const code = createUserCode()
    user.code = code

    // Generate random username from email
    const email = user.emails.find((email) => email.isPrimary === true).email
    user.username = generateFromEmail(email, 3)

    const expireAt = user.expireAt ? JSON.parse(user.expireAt) : null
    user['avatar'] = req.files['avatar'][0].filename
    user['passport'] = {
      image: req.files['passport'][0].filename,
      expireAt: expireAt['passport'],
    }
    user['identity'] = {
      image: req.files['identity-front'][0].filename,
      back: req.files['identity-back'][0].filename,
      expireAt: expireAt['identity'],
    }
    let updatedUser = user
    let companyData = null
    if (accountType === 'business') {
      const { name, email, phone, address, type, expiryDate, ...rest } = user
      updatedUser = { ...rest }
      companyData = {
        name,
        email,
        phone,
        address,
        type,
        accountType: accountType,
        expireAt: expiryDate,
        traderLicense: req.files['traderLicense'][0].filename,
        manager: null,
        establishmentContract: req.files['establishmentContract']?.length
          ? req.files['establishmentContract'][0].filename
          : null,
      }
    }

    const newUser = new User(updatedUser)
    const savedUser = await newUser.save()
    if (companyData) {
      companyData.manager = savedUser._id
      const newCompany = new Company(companyData)
      const savedCompany = await newCompany.save()
      await savedUser.update({
        company: { data: savedCompany._id, isManager: true },
      })
    }
    await chatClient.upsertUser({
      id: savedUser._id,
      name: savedUser.fullNameInEnglish,
      role: 'user',
      arabicName: savedUser.fullNameInArabic,
      image: savedUser.avatar,
    })
    const notification = {
      title: {
        en: 'New Registration',
        ar: 'تسجيل جديد',
      },
      body: {
        en: `${
          user.fullNameInEnglish
        } initiate new registration process with code #${code.toLocaleUpperCase()}#`,
        ar: `${
          user.fullNameInArabic
        } بدأ عملية تسجيل جديدة بكود رقم #${code.toLocaleUpperCase()}#`,
      },
    }

    await sendNotificationToAdminPanel(['manager', 'hr'], notification)

    res.status(201).send({
      code: 201,
      success: true,
      id: savedUser._id,
      phone: user.insidePhones.find((phone) => phone.isPrimary === true).phone,
      message: req.t('user_created_successfully'),
    })
  } catch (error) {
    next(error)
  }
}

export const updateDocuments = async (req, res, next) => {
  const { id } = req.params
  const { type } = req.query

  try {
    const expireAt = JSON.parse(req.body.expireAt)

    const documentExpire = new Date(expireAt[type]).getTime()
    const now = new Date().getTime()

    if (now > documentExpire) {
      res.status(400)
      throw new Error('Document already Expired')
    }

    const user = await User.findById(id)

    if (user[type] && user[type]?.image) {
      const imagePath = path.join(
        __dirname,
        'server',
        '../../../uploads',
        user[type].image
      )
      fs.existsSync(imagePath) && fs.unlinkSync(imagePath)
      if (user[type]?.back) {
        const imagePath = path.join(
          __dirname,
          'server',
          '../../../uploads',
          user[type].back
        )
        fs.existsSync(imagePath) && fs.unlinkSync(imagePath)
      }
    }
    if (type === 'passport') {
      user['passport'] = {
        image: req.files['passport'][0].filename,
        expireAt: expireAt['passport'],
      }
    } else {
      user['identity'] = {
        image: req.files['identity-front'][0].filename,
        back: req.files['identity-back'][0].filename,
        expireAt: expireAt['identity'],
      }
    }

    let documentState = null

    if (type === 'identity') {
      documentState = user.colorCode.state.filter(
        (st) =>
          st.label['en'] !== labels['idExpired']['en'] &&
          st.label['en'] !== labels['idUpload']['en']
      )
    } else {
      documentState = user.colorCode.state.filter(
        (st) =>
          st.label['en'] !== labels['passExpired']['en'] &&
          st.label['en'] !== labels['passUpload']['en']
      )
    }

    user.colorCode.state = documentState

    let docObject = {}

    if (type === 'passport') {
      docObject = {
        image: req.files['passport'][0].filename,
        expireAt: expireAt['passport'],
        isExpired: false,
      }
    } else {
      docObject = {
        identityFront: {
          image: req.files['identity-front'][0].filename,
          expireAt: expireAt['identity'],
          isExpired: false,
        },
        identityBack: {
          image: req.files['identity-back'][0].filename,
          expireAt: expireAt['identity'],
          isExpired: false,
        },
      }
    }

    await takeAction(user._id, 'green')

    await user.save()

    const documents = {
      identity: {
        en: 'Identity',
        ar: 'الهوية',
      },
      passport: {
        en: 'Passport',
        ar: 'جواز السفر',
      },
      residential: {
        en: 'Residential',
        ar: 'الإقامة',
      },
    }

    const notification = {
      title: {
        en: 'Document Update',
        ar: 'تحديث مستندات الإثبات',
      },
      body: {
        en: `Member ${user.fullNameInEnglish} with code #${
          user.code
        }# has updated his ${
          documents[type]['en']
        } Document at ${new Date().toLocaleDateString()}`,
        ar: ` العضو ${user.fullNameInArabic} بكود #${
          user.code
        }# قام بتحديث مستند ${
          documents[type]['ar']
        } الخاص به بتاريخ ${new Date().toLocaleDateString()}`,
      },
    }

    await sendNotificationToAdminPanel(['manager', 'hr'], notification)

    res.send({
      success: true,
      doc: docObject,
      code: 200,
      isDone: true,
    })
  } catch (error) {
    next(error)
  }
}

export const updatePhoneNumber = async (req, res, next) => {
  const { id } = req.params
  const { phone } = req.query

  try {
    const user = await User.findById(id)
    user.insidePhones.map((ph) => {
      if (ph.isPrimary === true) {
        if (ph.phone === `+${phone.trim()}`) {
          res.status(400)
          throw new Error(req.t('phone_already_exist', { phone }))
        }

        ph.phone = `+${phone.trim()}`
      }
      return ph
    })
    await user.save()

    res.send({
      success: true,
      code: 200,
      message: req.t('phone_updated_successfully'),
    })
  } catch (error) {
    next(error)
  }
}

// sent the code to user phone to verify the phone
export const sendConfirmCodeToPhoneHandler = async (req, res, next) => {
  const { id } = req.params
  const { email } = req.query

  try {
    if (!id && email) {
      await sendConfirmCodeToPhone(undefined, email)
    } else {
      await sendConfirmCodeToPhone(id)
    }
    res.send({
      success: true,
      code: 200,
      message: req.t('phone_code_sent'),
    })
  } catch (error) {
    next(error)
  }
}

// verify the user phone
export const verifyConfirmPhoneCodeHandler = async (req, res, next) => {
  const { id } = req.params
  const { code, email } = req.query
  try {
    let user
    if (!id && email) {
      user = await User.findOne({ 'emails.email': email })
    } else {
      user = await User.findById(id)
    }
    if (user.phoneCode !== code) {
      res.status(400)
      throw new Error(req.t('phone_code_not_valid'))
    }
    user.isPhoneConfirmed = true
    await user.save()
    id && !email && (await sendConfirmLinkToEmail(id, req))
    res.send({
      success: true,
      code: 200,
      message: req.t('phone_verification_success'),
    })
  } catch (error) {
    next(error)
  }
}

// send E-mail verification link to user E-mail
export const sendEmailVerificationLink = async (req, res, next) => {
  const { id } = req.params
  try {
    await sendConfirmLinkToEmail(id, req)
    res.send({
      success: true,
      code: 200,
      message: req.t('verification_link_sent_to_email'),
    })
  } catch (error) {
    next(error)
  }
}

// User Authentication using email and password
export const login = async (req, res, next) => {
  const { email, password } = req.body
  try {
    const user = await User.AuthUser(email, password, res, req.t)
    res.send({
      success: true,
      code: 200,
      user: user._id,
      message: req.t('login_code_sent_to_email'),
    })
  } catch (error) {
    next(error)
  }
}

// logout handler
export const logoutHandler = async (req, res, next) => {
  try {
    const user = req.user
    // if (user) {
    //   await chatClient.revokeUserToken(user._id.toString(), new Date())
    // }
    const sessionId = req.sessionId
    if (sessionId) {
      await Session.findByIdAndRemove(sessionId)
    }
    res.clearCookie('token')
    res.send({
      success: true,
      code: 200,
    })
  } catch (error) {
    next(error)
  }
}

// send Password Reset Link to user Email
export const sendPasswordResetLink = async (req, res, next) => {
  const { email } = req.query
  try {
    const user = await User.findOne({ 'emails.email': email })

    if (!user) {
      res.status(404)
      throw new Error(req.t('email_not_connected_with_account'))
    }

    await sendAuthLink(user, req, 'reset')

    res.send({
      success: true,
      code: 200,
      message: req.t('pass_reset_link_sent_to_email'),
    })
  } catch (error) {
    next(error)
  }
}

// send login code
export const sendLoginCodeHandler = async (req, res, next) => {
  const { id } = req.params
  try {
    await sendLoginCodeToEmail(id)
    res.send({
      success: true,
      code: 200,
      message: req.t('login_code_sent_to_email'),
    })
  } catch (error) {
    next(error)
  }
}

// SEARCH FOR USERS BY [CODE - PHONE - USERNAME]

export const findUserHandler = async (req, res, next) => {
  const { code, mobile, username } = req.query
  try {
    let users

    if (mobile) {
      users = await User.find({
        'insidePhones.phone': mobile,
        _id: { $ne: req.user._id },
        isProvider: false,
        isBlocked: false,
      }).populate('company.data', 'name')
      if (users.length === 0) {
        res.status(404)
        throw new Error(req.t('no_user_found_search_again'))
      }
    } else {
      let searchFilter = {}

      if (code) {
        searchFilter = { code }
      }
      if (username) {
        searchFilter = { username }
      }

      users = await User.find({
        ...searchFilter,
        _id: { $ne: req.user._id },
        isProvider: false,
        isBlocked: false,
      }).populate('company.data', 'name')
      if (users.length === 0) {
        res.status(404)
        throw new Error(req.t('no_user_found_search_again'))
      }
    }
    const allUsers = users.map((user) => ({
      _id: user._id,
      name: user.fullNameInEnglish,
      code: user.code,
      arabicName: user.fullNameInArabic,
      image: user.avatar,
      color: user.colorCode.code,
      company: user.company.data,
      isEmployee: user.isEmployee,
    }))
    res.send({
      success: true,
      code: 200,
      users: allUsers,
    })
  } catch (error) {
    next(error)
  }
}

export const verifyAuthLink = async (req, res, next) => {
  const { token, type, password } = req.body
  try {
    // decode the token to extract user id
    const decode = jwt.verify(token, process.env.RESET_TOKEN, (err, decode) => {
      if (err) {
        throw new Error(req.t('link_invalid'))
      }
      return decode
    })
    // find the user using id from token
    const user = await User.findOne({ _id: decode.id })

    // if not user send error
    if (!user) throw new Error(req.t('no_user_found'))

    // check if reset code == the user reset code
    const isResetCodeMatch = await bcrypt.compare(decode.code, user.authString)

    // if not send error
    if (!isResetCodeMatch) throw new Error(req.t('link_invalid'))

    if (type === 'activate') {
      user.isEmailConfirmed = true
      await user.save()
      res.json({
        success: true,
        code: 200,
        message: req.t('email_verification_success'),
      })
    } else if (type === 'reset') {
      user.password = password
      await user.save()

      res.json({
        success: true,
        code: 200,
        message: req.t('pass_reset_success'),
      })
    } else {
      res.status(204).send()
    }
  } catch (error) {
    next(error)
  }
}

// verify the code that sent to email during every authentication
//  to add more security when authenticate user
export const verifyLoginCodeHandler = async (req, res, next) => {
  const { code, isRemembered } = req.body
  const { id } = req.params
  try {
    const user = await User.findById(id)
    if (user.emailCode !== code && !user.isGuest) {
      res.status(400)
      throw new Error(req.t('login_code_not_valid'))
    }
    if (user.isGuest && code !== 'GU85nEr') {
      res.status(400)
      throw new Error(req.t('login_code_not_valid'))
    }
    if (!user.isEmailConfirmed) {
      user.isEmailConfirmed = true
      await user.save()
    }

    // create session document
    const session = new Session()
    // create authToken
    const data = {
      payload: { sessionId: session._id.toString() },
      secret: process.env.JWT_TOKEN,
    }
    const tokenExpiry = isRemembered ? `7 days` : '1d'
    const authToken = user.generateToken(data, tokenExpiry)
    // create sessionToken
    const sessionData = {
      payload: { sessionId: session._id.toString() },
      secret: process.env.SESSION_TOKEN_SECRET,
    }
    const sessionToken = user.generateToken(sessionData, 60)
    // get expireAt
    const expireDate = expireAt(isRemembered ? 7 : 1)
    // assign value to new session
    session.sessionToken = sessionToken
    session.authToken = authToken
    session.expireAt = expireDate
    session.user = user._id
    // save session
    await session.save()

    res.json({
      success: true,
      code: 200,
      payload: {
        token: sessionToken,
        expireAt: expireDate,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const checkIsUserLoggedIn = async (req, res, next) => {
  // const { users } = await chatClient.queryUsers({ id: req.user._id.toString() })
  // const chat_token = users.length
  //   ? chatClient.createToken(req.user._id.toString())
  //   : null
  try {
    const userData = {
      _id: req.user._id,
      username: req.user.username,
      fullNameInEnglish: req.user.fullNameInEnglish,
      fullNameInArabic: req.user.fullNameInArabic,
      avatar: req.user.avatar,
      color: req.user.colorCode.code,
      company: req.user.company,
      isProvider: req.user.isProvider,
      isBlocked: req.user.isBlocked,
      // chat_token,
    }
    res.json({
      success: true,
      code: 200,
      user: userData,
    })
  } catch (error) {
    next(error)
  }
}

// Send the user data
export const sendUserData = async (req, res, next) => {
  const { id } = req.params
  try {
    let user = null

    if (id) {
      if (
        req.user.roles.includes('manager') ||
        req.user.roles.includes('hr') ||
        req.user.roles.includes('cs')
      ) {
        const userData = await User.findById(id).populate('company.data')
        user = { ...userData._doc }
      } else {
        res.status(401)
        throw new Error('Not Authorized to handle request')
      }
    } else {
      user = { ...req.user._doc }
    }

    if (user.identity) {
      const now = DateTime.now().ts
      const date = new Date(user.identity.expireAt)
      const expiry = DateTime.fromJSDate(date).ts

      user['identity-front'] = {
        _id: uuidv4(),
        image: user.identity.image,
        isExpired: now > expiry,
      }

      user['identity-back'] = {
        _id: uuidv4(),
        image: user.identity.back,
        isExpired: now > expiry,
      }

      delete user.identity
    }

    if (user.passport) {
      const now = DateTime.now().ts
      const date = new Date(user.passport.expireAt)
      const expiry = DateTime.fromJSDate(date).ts
      const passport = {
        _id: uuidv4(),
        image: user.passport.image,
        isExpired: now > expiry,
      }
      user.passport = passport
    }

    res.send({
      success: true,
      code: 200,
      user,
    })
  } catch (error) {
    next(error)
  }
}

export const updatePhoneAndAddress = async (req, res, next) => {
  const { outsidePhones, outsideAddress } = req.body

  try {
    let updateData = {}
    if (outsideAddress) {
      req.user.outsideAddress = outsideAddress
      updateData = { outsideAddress }
    }
    if (outsidePhones) {
      req.user.outsidePhones = outsidePhones
      updateData = { outsidePhones }
    }
    await req.user.save()
    res.send({
      success: true,
      code: 200,
      user: updateData,
    })
  } catch (error) {
    next(error)
  }
}

export const updateUserPassword = async (req, res, next) => {
  const { password } = req.body
  try {
    req.user.password = password
    await req.user.save()
    res.send({
      success: true,
      code: 200,
      message: req.t('pass_update_success'),
    })
  } catch (error) {
    next(error)
  }
}

export const updateUserPreferredLanguage = async (req, res, next) => {
  const { lang } = req.query
  try {
    req.user.preferredLanguage = lang
    await req.user.save()

    res.send({
      code: 200,
      success: true,
      message: req.t('user_language_changed'),
    })
  } catch (error) {
    next(error)
  }
}

////////////////////////////////////////////////////
// Dashboard Routers
///////////////////////////////////////////////////

// LIST ALL USERS FOR ADMIN DASHBOARD
export const listAllUsers = async (req, res, next) => {
  const {
    skip,
    arabicName,
    englishName,
    code,
    username,
    color,
    isProvider,
    isActive,
    email,
    phone,
    country,
  } = req.query

  let searchFilter = {}

  try {
    if (code) {
      searchFilter = {
        ...searchFilter,
        code,
      }
    }
    if (arabicName) {
      searchFilter = {
        ...searchFilter,
        fullNameInArabic: {
          $regex: arabicName,
          $options: 'i',
        },
      }
    }
    if (englishName) {
      searchFilter = {
        ...searchFilter,
        fullNameInEnglish: {
          $regex: englishName,
          $options: 'i',
        },
      }
    }
    if (email) {
      searchFilter = {
        ...searchFilter,
        'emails.email': email,
      }
    }
    if (phone) {
      searchFilter = {
        ...searchFilter,
        'insidePhones.phone': phone,
      }
    }
    if (country) {
      searchFilter = {
        ...searchFilter,
        'country.name': {
          $regex: country,
          $options: 'i',
        },
      }
    }
    if (username) {
      searchFilter = {
        ...searchFilter,
        username,
      }
    }
    if (color) {
      searchFilter = {
        ...searchFilter,
        'colorCode.code': color,
      }
    }
    if (isProvider) {
      searchFilter = {
        ...searchFilter,
        isProvider: isProvider === 'true',
      }
    }

    if (isActive) {
      searchFilter = {
        ...searchFilter,
        isAccountConfirmed: isActive === 'true',
      }
    }

    const users = await User.find(
      { ...searchFilter },
      {
        code: 1,
        colorCode: 1,
        fullNameInEnglish: 1,
        fullNameInArabic: 1,
        createdAt: 1,
        avatar: 1,
        isAccountConfirmed: 1,
        isProvider: 1,
      }
    ).sort({ createdAt: -1 })

    if (!users.length) {
      res.status(404)
      throw new Error(req.t('no_users_found'))
    }

    const count = await User.count({ ...searchFilter })

    res.send({
      code: 200,
      success: true,
      users,
      count,
    })
  } catch (error) {
    next(error)
  }
}

// DELETE USER ROUTER
export const deleteUser = async (req, res, next) => {
  const { id } = req.params
  const lang = req.headers['accept-language']
  try {
    const user = await User.findById(id)
    if (!user) {
      res.status(404)
      throw new Error(req.t('no_user_found'))
    }
    await user.remove()

    const name = lang === 'ar' ? user.fullNameInArabic : user.fullNameInEnglish

    res.send({
      code: 200,
      success: true,
      message: req.t('user_deletion_success', { name }),
    })
  } catch (error) {
    next(error)
  }
}

// TOGGLE USER ACTIVATION

export const toggleUserActivation = async (req, res, next) => {
  const { id } = req.params

  try {
    const user = await User.findById(id)
    if (!user) {
      res.status(404)
      throw new Error(req.t('no_user_found'))
    }
    user.isAccountConfirmed = !user.isAccountConfirmed
    await user.save()

    res.send({
      success: true,
      code: 200,
      isConfirmed: user.isAccountConfirmed,
    })
  } catch (error) {
    next(error)
  }
}

export const changeUserColorCode = async (req, res, next) => {
  const { id } = req.params
  const { code, state } = req.body

  try {
    const user = await User.findById(id)

    if (!user) {
      res.status(404)
      throw new Error(req.t('no_user_found'))
    }

    if (code === '#037A12') {
      user.colorCode = {
        code,
        state: [],
      }
    } else {
      user.colorCode = {
        code,
        state: [...user.colorCode.state, state],
      }
    }

    await user.save()

    res.send({
      success: true,
      code: 200,
      message: req.t('color_code_change_success'),
    })
  } catch (error) {
    next(error)
  }
}

export const sendContactEmail = async (req, res, next) => {
  const { name, phone, email, message } = req.body

  try {
    if (!name) {
      res.status(400)
      throw new Error(req.t('name_is_required'))
    }
    if (!phone) {
      res.status(400)
      throw new Error(req.t('phone_is_required'))
    }
    if (!email) {
      res.status(400)
      throw new Error(req.t('email_is_required'))
    }
    if (!message) {
      res.status(400)
      throw new Error(req.t('message_is_required'))
    }

    const info = { name, message, phone, email }
    await sendEmail(info, 'contact', 'swtle.op@gmail.com')
    res.send({
      code: 200,
      success: true,
      message: req.t('contact_message_sent'),
    })
  } catch (error) {
    next(error)
  }
}

export const getPreviousClients = async (req, res, next) => {
  const { id } = req.params
  const { skip } = req.query
  const skipValue = skip !== 'undefined' ? parseInt(skip) : 0
  const lang = req.headers['accept-language']
  try {
    const user = await User.findById(id)
    if (!user) {
      res.status(404)
      throw new Error(req.t('no_user_found'))
    }
    const mutuals = await MutualClients.find({ clients: { $in: [user._id] } })
      .populate({
        path: 'clients',
        match: { _id: { $ne: user._id } },
        select: 'fullNameInEnglish fullNameInArabic avatar colorCode.code',
      })
      .limit(5)
      .skip(skipValue)
      .sort({ updatedAt: -1 })

    const countDocuments = await MutualClients.count({
      clients: { $in: [user._id] },
    })
    res.send({
      code: 200,
      success: true,
      count: countDocuments,
      mutuals: mutuals.length
        ? mutuals.map((m) => ({
            _id: m.clients[0]._id,
            arabicName: m.clients[0].fullNameInArabic,
            name: m.clients[0].fullNameInEnglish,
            image: m.clients[0].avatar,
            operations: m.operations.length,
            color: m.clients[0].colorCode.code,
          }))
        : [],
    })
  } catch (error) {
    next(error)
  }
}

/*******************************************************************/
/******************** HELPER FUNCTION 
/******************************************************************/

///////////////////////////////////////////
// PHONE VERIFICATION PROCESS
///////////////////////////////////////////
async function sendConfirmCodeToPhone(id, email) {
  try {
    let user
    if (!id && email) {
      user = await User.findOne({ 'emails.email': email })
    } else {
      user = await User.findById(id)
    }
    if (!user) {
      res.status(404)
      throw new Error(req.t('no_user_found'))
    }
    const phone = user.insidePhones.find(
      (phone) => phone.isPrimary === true
    ).phone
    const code = generateRandomCode(6)
    user.phoneCode = code
    await user.save()
    sendSMS(phone, code)
  } catch (error) {
    throw new Error(error)
  }
}

///////////////////////////////////////////
// E-MAIL VERIFICATION PROCESS
///////////////////////////////////////////
async function sendConfirmLinkToEmail(id, req) {
  try {
    const user = await User.findById(id)
    await sendAuthLink(user, req, 'activate')
  } catch (error) {
    throw new Error(error)
  }
}

///////////////////////////////////////////
// E-MAIL CODE PROCESS
///////////////////////////////////////////
async function sendLoginCodeToEmail(id) {
  try {
    const user = await User.findById(id)
    const code = user.isGuest ? 'GU85nEr' : generateRandomCode(7, 'string')
    user.emailCode = code
    await user.save()

    const info = {
      code: code,
      name: user.fullNameInEnglish,
      email: user.emails.find((email) => email.isPrimary === true).email,
    }
    if (process.env.NODE_ENV === 'production') {
      !user.isGuest && (await sendEmail(info, 'code'))
    }
  } catch (error) {
    throw new Error(error)
  }
}

async function sendAuthLink(user, req, type) {
  try {
    // create randomstring
    const resetCode = randomstring.generate()

    // create token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        code: resetCode,
      },
      process.env.RESET_TOKEN,
      { expiresIn: '1 day' }
    )

    // crypt this random string
    const cryptResetCode = await bcrypt.hash(resetCode, 10)
    // store in db
    user.authString = cryptResetCode
    await user.save()

    // compose the url
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/${type}?TOKEN=${token}`
    const info = {
      link: resetUrl,
      name: user.fullNameInEnglish,
      email: user.emails.find((email) => email.isPrimary === true).email,
    }
    await sendEmail(info, type)
  } catch (error) {
    throw new Error(error)
  }
}

const sendNotificationToAdminPanel = async (roles, data) => {
  try {
    const users = await User.find({ roles: { $in: roles } })
    const usersIds = users.map((user) => user._id)
    if (usersIds.length) {
      for (const id of usersIds) {
        data.user = id
        const newNotification = new Notification(data)
        await newNotification.save()
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const generateRandomCode = (count, type) => {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  const alphanumeric = [
    'A',
    0,
    'B',
    1,
    'C',
    2,
    'D',
    3,
    'E',
    4,
    'F',
    5,
    'G',
    6,
    'H',
    7,
    'I',
    8,
    'J',
    'K',
    'L',
    3,
    'M',
    'N',
    9,
    'O',
    'P',
    2,
    'Q',
    'R',
    1,
    'S',
    'T',
    'Y',
    0,
    'Z',
  ]
  let randomArray
  if (type === 'string') {
    randomArray = [...Array(count)].map((_) => {
      return alphanumeric[Math.ceil(Math.random() * (numbers.length - 1))]
    })
  } else {
    randomArray = [...Array(count)].map((_) => {
      return numbers[Math.ceil(Math.random() * (numbers.length - 1))]
    })
  }

  return randomArray.join('')
}

// CREATE USER UNIQUE CODE
export const createUserCode = () => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
  const randomCharacters = () =>
    alphabet[Math.floor(Math.random() * alphabet.length)].toLocaleUpperCase()
  let randomString = ''
  for (let i = 0; i < 3; i++) {
    randomString += randomCharacters()
  }
  const randomNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  let codeNumber = ''
  for (let i = 0; i < 6; i++) {
    const num = randomNumbers[Math.floor(Math.random() * randomNumbers.length)]
    codeNumber += num
  }
  return randomString + codeNumber
}

const scanUserDocuments = async () => {
  let date = DateTime.now()
    .setZone('Africa/Cairo')
    .toLocaleString(DateTime.DATETIME_MED)
  console.log(`Start Users Scanning.... at ${date}`)
  try {
    const users = await User.find({})

    if (users.length) {
      for (const user of users) {
        if (user.identity && user.identity.expireAt) {
          await documentExpiredHandler(user._id, 'identity', 'idExpired')
        }

        if (user.passport && user.passport.expireAt) {
          await documentExpiredHandler(user._id, 'passport', 'passExpired')
        }
      }
    }

    date = DateTime.now()
      .setZone('Africa/Cairo')
      .toLocaleString(DateTime.DATETIME_MED)
    console.log(`Done Users Scanning!!!! at ${date}`)
  } catch (error) {
    date = DateTime.now()
      .setZone('Africa/Cairo')
      .toLocaleString(DateTime.DATETIME_MED)
    console.error(
      '\x1b[31m',
      `Done Users Scanning!!!! at ${date} with ERROR: ${error.message}`
    )
  }
}

const documentExpiredHandler = async (id, document, action) => {
  const user = await User.findById(id)

  const now = DateTime.now().setZone('Asia/Dubai').ts

  const expiryDateObject = new Date(user[document].expireAt)
  const expiryDate =
    DateTime.fromJSDate(expiryDateObject).setZone('Asia/Dubai').ts

  if (now > expiryDate) {
    await takeAction(user._id, 'yellow', action)
  } else {
    const now = DateTime.now().setZone('Asia/Dubai')

    const expiryDateObject = new Date(user[document].expireAt)
    const expiryDate =
      DateTime.fromJSDate(expiryDateObject).setZone('Asia/Dubai')

    const weekDiff = expiryDate.diff(now, ['days', 'hours'])
    const weekDiffInDays = weekDiff.values.days
    if (weekDiffInDays < 8 && weekDiffInDays > 6) {
      documentsInArabic
      const newNotification = {
        user: user._id,
        title: {
          en: `Your ${capitalize(document)} About to Expire`,
          ar: `صلاحية ${documentsInArabic[document]} على وشك الإنتهاء`,
        },
        body: {
          en: `We Remind you to upload your new ${document} because you only have less than a week
                    before your ${document} EXPIRE`,
          ar: `هذا إشعار تذكير برفع ${documentsInArabic[document]} جديد لأن تاريخ صلاحية المستند القديم على وشك الإنتهاء فى وقت أقل من أسبوع`,
        },
      }
      // sent notification to user
      const notification = new Notification(newNotification)
      await notification.save()

      const info = {
        name: user.fullNameInEnglish,
        type: capitalize(document),
        date: new Date(user[document].expireAt).toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        image: `https://www.swtle.com/api/files/${user[document].image}`,
      }

      // send email to inform the user
      await sendEmail(info, 'reminder')
    }
  }
}

function capitalize(string) {
  return string.charAt(0).toLocaleUpperCase() + string.slice(1)
}

function expireAt(day) {
  const today = new Date()
  const expiry = new Date(today)
  return expiry.setDate(today.getDate() + day)
}

cron.schedule('33 6 * * *', scanUserDocuments, {
  timezone: 'Asia/Dubai',
})
