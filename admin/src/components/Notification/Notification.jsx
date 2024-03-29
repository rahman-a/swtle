import React, { useState } from 'react'
import style from './style.module.scss'
import { useDispatch } from 'react-redux'
import classnames from 'classnames'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import { OperationDecision } from '@/src/components'
import actions from '@/src/actions'
import { renderStateMessage } from '@/src/config/stateMessage'

const Notification = ({ data }) => {
  const [isStateOn, setIsStateOn] = useState(false)
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const lang = i18next.language

  const stateColorStyle = (_) => {
    const color =
      data.state === 'pending'
        ? '#FBFCD4'
        : data.state === 'active'
        ? '#C7FFCE'
        : data.state === 'decline'
        ? '#FCD4DB'
        : '#406882'

    return color
  }

  const takeDecisionHandler = (_) => {
    if (data.state === 'pending') {
      setIsStateOn(true)
    } else {
      dispatch(actions.notifications.updateNotificationState(data.id))
    }
  }

  const notificationClasses = classnames(style.notification, {
    [style.notification_ar]: lang === 'ar',
  })

  return (
    <>
      {isStateOn && (
        <OperationDecision
          show={isStateOn}
          onHide={() => setIsStateOn(false)}
          id={data.operation}
          notificationId={data.id}
        />
      )}

      <div
        className={notificationClasses}
        onClick={takeDecisionHandler}
        style={{ backgroundColor: data.isRead ? '#fff' : '#e7f5ff' }}
      >
        <img src={data.image} alt={data.title} />
        <div className={style.notification__content}>
          <h3>{data.title}</h3>
          <span>{data.date}</span>
          <p>{renderStateMessage(data.message, style.notification__report)}</p>
        </div>
        <div
          className={style.notification__state}
          style={{ backgroundColor: stateColorStyle() }}
        >
          <p style={{ color: data.state ? '#406882' : '#fff' }}>
            {t(data.state) || t('notice')}
          </p>
        </div>
      </div>
    </>
  )
}

export default Notification
