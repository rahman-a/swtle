import React, { useState, useEffect } from 'react'
import style from './style.module.scss'
import { Form, Button } from 'react-bootstrap'
import { v4 as uuidv4 } from 'uuid'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import Documents from './Documents'
import Phones from './Phones'
import Address from './Address'
import Personal from './Personal'
import Credential from './Credential'
import { SideAlert, Loader } from '@/src/components'
import actions from '@/src/actions'
import constants from '@/src/constants'

const Provider = () => {
  const [info, setInfo] = useState({
    username: '',
    password: '',
    fullNameInArabic: '',
    fullNameInEnglish: '',
    company: '',
    avatar: '',
    insideAddress: '',
    outsideAddress: '',
    isProvider: true,
    isPhoneConfirmed: true,
    isEmailConfirmed: true,
    isAccountConfirmed: true,
  })

  const [insidePhones, setInsidePhones] = useState([
    { id: uuidv4(), isPrimary: '', phone: null },
  ])

  const [outsidePhones, setOutsidePhones] = useState([
    { id: uuidv4(), phone: null },
  ])

  const [emailValues, setEmailValues] = useState([
    { id: uuidv4(), isPrimary: '', email: null },
  ])

  const [country, setCountry] = useState(null)
  const [identity, setIdentity] = useState({})
  const [passport, setPassport] = useState({})

  const [errors, setErrors] = useState(null)

  const dispatch = useDispatch()
  const { loading, error, message } = useSelector(
    (state) => state.createProvider
  )
  const { t } = useTranslation()

  const getInfoValues = (e) => {
    let value = null
    if (e.target.name === 'avatar') {
      value = { [e.target.name]: e.target.files[0] }
    } else {
      value = { [e.target.name]: e.target.value }
    }
    setInfo({ ...info, ...value })
  }

  const checkFormValidation = (_) => {
    const infoValues = {
      username: t('username'),
      password: t('password'),
      fullNameInArabic: t('full-name-in-arabic'),
      fullNameInEnglish: t('full-name-in-english'),
      company: t('company-name'),
      insideAddress: t('uae-addresses'),
      outsideAddress: t('outside-uae-addresses'),
      avatar: t('personal-image'),
    }

    for (let key in info) {
      if (!info[key]) {
        setErrors(t('provide-data', { data: infoValues[key] }))
        return false
      }
    }

    if (!country) {
      setErrors(t('choose-provider-country'))
      return false
    }

    for (let key in emailValues) {
      if (!emailValues[key].email) {
        setErrors(t('enter-provider-email'))
        return false
      }
    }

    for (let key in insidePhones) {
      if (!insidePhones[key].phone) {
        setErrors(t('enter-provider-phone-uae'))
        return false
      }
    }

    if (Object.keys(identity).length === 0) {
      setErrors(t('upload-provider-identity'))
      return false
    }

    if (!identity.image) {
      setErrors(t('upload-provider-identity-front'))
      return false
    }

    if (!identity.back) {
      setErrors(t('upload-provider-identity-back'))
      return false
    }

    if (!identity.expireAt) {
      setErrors(t('select-provider-identity-expiry'))
      return false
    }

    if (!passport.image) {
      setErrors(t('upload-provider-passport'))
      return false
    }

    if (!passport.expireAt) {
      setErrors(t('select-provider-passport-expiry'))
      return false
    }

    return true
  }

  const createProviderAccount = (e) => {
    e.preventDefault()

    if (checkFormValidation()) {
      const emails = emailValues.map((email) => {
        return { email: email.email, isPrimary: email.isPrimary }
      })

      const insidePhonesValues = insidePhones.map((phone) => {
        return { phone: phone.phone, isPrimary: phone.isPrimary }
      })

      const outsidePhonesValues = []
      outsidePhones.forEach((phone) => {
        if (phone.phone) {
          outsidePhonesValues.push(phone.phone)
        }
      })

      let data = {
        ...info,
        emails,
        country,
        insidePhones: insidePhonesValues,
        'identity-front': identity.image,
        'identity-back': identity.back,
        expiryAt: { identity: identity.expireAt },
      }

      if (outsidePhonesValues.length) {
        data['outsidePhones'] = outsidePhonesValues
      }

      if (passport.image) {
        data['passport'] = passport.image
        data['expiryAt'] = { ...data['expiryAt'], passport: passport.expireAt }
      }

      const providerData = new FormData()
      for (let key in data) {
        if (
          key === 'expiryAt' ||
          key === 'emails' ||
          key === 'insidePhones' ||
          key === 'country'
        ) {
          providerData.append(key, JSON.stringify(data[key]))
        } else {
          providerData.append(key, data[key])
        }
      }
      dispatch(actions.admin.createProvider(providerData))
    }
  }

  useEffect(() => {
    if (error) {
      setErrors(error)
      setTimeout(() => {
        dispatch({ type: constants.admin.CREATE_PROVIDER_RESET })
      }, 10500)
    }
  }, [error])

  useEffect(() => {
    return () => dispatch({ type: constants.admin.CREATE_PROVIDER_RESET })
  }, [])

  return (
    <div className={style.provider}>
      <SideAlert
        text={errors}
        isOn={errors ? true : false}
        reset={() => setErrors(null)}
        type='danger'
      />
      <SideAlert text={message} isOn={message ? true : false} type='success' />
      <h1 className='main-header'> {t('create-provider-account')} </h1>
      <div className='container'>
        <div className={style.provider__wrapper}>
          <Form>
            <div className={style.provider__container}>
              <div className={style.provider__info}>
                <Credential
                  getInfoValues={getInfoValues}
                  emailValues={emailValues}
                  setEmailValues={setEmailValues}
                />

                <Personal
                  getInfoValues={getInfoValues}
                  setCountry={setCountry}
                />

                <Address getInfoValues={getInfoValues} />

                <Phones
                  insidePhones={insidePhones}
                  setInsidePhones={setInsidePhones}
                  outsidePhones={outsidePhones}
                  setOutsidePhones={setOutsidePhones}
                />
              </div>

              <div className={style.provider__info}>
                <Documents
                  setIdentity={setIdentity}
                  identity={identity}
                  setPassport={setPassport}
                  passport={passport}
                  getInfoValues={getInfoValues}
                />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    variant='success'
                    size='lg'
                    onClick={createProviderAccount}
                  >
                    {t('save')}
                  </Button>
                  {loading && (
                    <Loader size='4' options={{ animation: 'border' }} />
                  )}
                </div>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default Provider
