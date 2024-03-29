import React from 'react'
import style from './style.module.scss'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import classnames from 'classnames'
import { Loader } from '@/src/components'
import actions from '@/src/actions'

const NotifyContainer = ({
  title,
  data,
  setToggleNotification,
  setToggleMessages,
  loading,
  error,
  onClick,
}) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const lang = i18next.language

  const navigateToPage = (data) => {
    if (title === 'Notification') {
      setToggleNotification(false)
      navigate('/notifications')
    } else {
      setToggleMessages(false)
      data?.conversation
        ? navigate(`/chat/${data.conversation}`)
        : navigate(`/chat`)
      dispatch(actions.chat.markAsReceived(data.message))
    }
  }

  const notifyContainerClasses = classnames(style.notify__container, {
    [style.notify__container_ar]: lang === 'ar',
  })

  return (
    <div onClick={onclick ? onclick : null} className={notifyContainerClasses}>
      <h4>{title}</h4>
      <ul
        className={style.notify__list}
        style={{ height: (loading || error) && '15rem' }}
      >
        {data ? (
          data.map((notify) => {
            return (
              <li
                key={notify._id}
                onClick={() =>
                  navigateToPage({
                    conversation: notify.conversation,
                    message: notify.message,
                  })
                }
                className={style.notify__item}
                style={{
                  backgroundColor: !notify.isRead ? '#dff5ff' : 'unset',
                }}
              >
                <h3>{notify.title}</h3>
                <p>{notify.body?.substr(0, 45) + '....'}</p>
              </li>
            )
          })
        ) : loading ? (
          <Loader size='5' center options={{ animation: 'border' }} />
        ) : (
          error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>
        )}
      </ul>
      {data && <button onClick={navigateToPage}>{t('show-all')}</button>}
    </div>
  )
}

export default NotifyContainer
