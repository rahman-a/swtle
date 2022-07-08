import React, { useState } from 'react'
import style from './style.module.scss'
import CopyToClipboard from 'react-copy-to-clipboard'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, Edit, Trash, Wrench } from '../../icons'
import { Loader } from '../../components'
import Delete from './Delete'

const Panel = ({ user }) => {
  const [isCopied, setIsCopied] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toggleDelete, setToggleDelete] = useState(false)
  const lang = i18next.language
  const { t } = useTranslation()
  const navigate = useNavigate()

  const copyIdHandler = (_) => {
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
    }, 500)
  }

  const dateFormat = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }

  return (
    <>
      <Delete
        toggleDelete={toggleDelete}
        setToggleDelete={setToggleDelete}
        setIsDeleting={setIsDeleting}
        id={user._id}
      />
      <div className={style.panel}>
        <div className={style.panel__header}>
          <div
            className={`${style.panel__header_id} ${
              lang === 'ar' ? style.panel__header_id_ar : ''
            }`}
          >
            <CopyToClipboard text={user.code} onCopy={copyIdHandler}>
              <span>{isCopied ? <Check /> : <Copy />}</span>
            </CopyToClipboard>
            <span>{`#${user.code}`}</span>
          </div>
          {!user.isAccountConfirmed && (
            <div className={style.panel__header_activate}>
              {t('need-activation')}
            </div>
          )}
          <div
            className={`${style.panel__header_state} ${
              lang === 'ar' ? style.panel__header_state_ar : ''
            }`}
          >
            <span onClick={() => navigate(`/member/${user._id}`)}>
              <Edit />
            </span>
            {isDeleting ? (
              <Loader size='4' options={{ animation: 'border' }} />
            ) : (
              <span onClick={() => setToggleDelete(true)}>
                <Trash />
              </span>
            )}
          </div>
        </div>
        <div className={style.panel__body}>
          <figure
            className={`${style.panel__body_photo} ${
              lang === 'ar' ? style.panel__body_photo_ar : ''
            }`}
            style={{ backgroundColor: user.colorCode.code }}
          >
            <img
              src={`/api/files/${user.avatar}`}
              alt={user.fullNameInEnglish}
            />
          </figure>
          <div className={style.panel__body_data}>
            <div
              className={`${style.panel__body_name} ${
                lang === 'ar' ? style.panel__body_name_ar : ''
              }`}
            >
              <p>
                {lang === 'ar' ? user.fullNameInArabic : user.fullNameInEnglish}
                {user.isProvider && (
                  <span>
                    <Wrench />
                  </span>
                )}
              </p>
            </div>
            <div
              className={`${style.panel__body_date} ${
                lang === 'ar' ? style.panel__body_date_ar : ''
              }`}
            >
              {t('registration-date')}:
              <p>
                <span>
                  {new Date(user.createdAt).toLocaleDateString(
                    'en-US',
                    dateFormat
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Panel