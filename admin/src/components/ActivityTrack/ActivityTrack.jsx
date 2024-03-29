import React, { useEffect, useRef } from 'react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import style from './style.module.scss'
import { Logout } from '@/src/icons'
import actions from '@/src/actions'

const ActivityTrack = ({ setSideMenu }) => {
  const timeout = useRef(null)
  const [warn, setWarn] = useState(false)
  const [trackLogoutWarnTime, setTrackLogoutWarnTime] = useState(10)
  const trackLogoutTimeRef = useRef(null)
  const { t } = useTranslation()
  const { isAuth } = useSelector((state) => state.login)
  const dispatch = useDispatch()

  const logoutHandler = () => {
    clearTimeout(timeout.current)
    setWarn(true)
  }

  const stopLogoutHandler = () => {
    trackLogoutTimeRef.current && clearTimeout(trackLogoutTimeRef.current)
    setTrackLogoutWarnTime(10)
    setWarn(false)
  }

  const addActivityListener = () => {
    document.addEventListener('mousemove', resetTimeout)
    document.addEventListener('scroll', resetTimeout)
    document.addEventListener('keypress', resetTimeout)
    document.addEventListener('click', resetTimeout)
    document.addEventListener('touchstart', resetTimeout)
  }

  const removeActivityListener = () => {
    document.removeEventListener('mousemove', resetTimeout)
    document.removeEventListener('scroll', resetTimeout)
    document.removeEventListener('keypress', resetTimeout)
    document.removeEventListener('click', resetTimeout)
    document.removeEventListener('touchstart', resetTimeout)
  }

  const resetTimeout = () => {
    if (timeout.current) {
      clearTimeout(timeout.current)
    }
    timeout.current = isAuth ? setTimeout(logoutHandler, 290000) : null
  }

  useEffect(() => {
    if (trackLogoutWarnTime < 10 && trackLogoutWarnTime > 0) {
      trackLogoutTimeRef.current && clearTimeout(trackLogoutTimeRef.current)
      trackLogoutTimeRef.current = setTimeout(() => {
        setTrackLogoutWarnTime(trackLogoutWarnTime - 1)
      }, 1000)
    }

    if (trackLogoutWarnTime <= 0) {
      trackLogoutTimeRef.current && clearTimeout(trackLogoutTimeRef.current)
      dispatch(actions.admin.logout())
    }
  }, [trackLogoutWarnTime])

  useEffect(() => {
    if (warn) {
      trackLogoutTimeRef.current = setTimeout(() => {
        setTrackLogoutWarnTime(trackLogoutWarnTime - 1)
      }, 1000)
    }
  }, [warn])

  useEffect(() => {
    if (isAuth) {
      resetTimeout()
      addActivityListener()
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout.current)
      }
      removeActivityListener()
      setTrackLogoutWarnTime(10)
      setSideMenu(false)
    }
  }, [timeout, isAuth])
  return (
    <div>
      <Modal show={warn} onHide={() => setWarn(false)} centered>
        <Modal.Body style={{ padding: 0 }}>
          <div className={style.track}>
            <div className={style.track__header}>
              <Logout />
              <span>{t('logout')}</span>
            </div>
            <div className={style.track__message}>
              {t('about-to-logout', { time: trackLogoutWarnTime })}
            </div>
            <button className={style.track__btn} onClick={stopLogoutHandler}>
              {t('cancel-btn')}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default ActivityTrack
