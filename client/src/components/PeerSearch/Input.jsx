// @ts-nocheck
import React, { useEffect, useState } from 'react'
import style from './style.module.scss'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import classnames from 'classnames'
import { Loader } from '..'
import CompanyLabel from './CompanyLabel'
import StatusLabel from './StatusLabel'
import actions from '@/src/actions'
import constants from '@/src/constants'
import { Check } from '@/src/icons'

const Input = ({
  filter,
  setPeerInfo,
  searchValue,
  setSearchValue,
  lang,
  mutuals,
  type,
}) => {
  const { t } = useTranslation()

  const placeholder = {
    username: t('search-username'),
    mobile: t('search-mobile'),
    code: t('search-user-code'),
  }
  const [isError, setIsError] = useState(null)
  const [peers, setPeers] = useState(null)
  const [isListFocused, setIsListFocused] = useState(false)
  const [isPeerSelectedForPrinting, setIsPeerSelectedForPrinting] =
    useState(false)
  const [inputPlaceholder, setInputPlaceholder] = useState(placeholder[filter])
  const { loading, error, users } = useSelector((state) => state.searchUsers)
  const dispatch = useDispatch()

  const searchPeersHandler = (_) => {
    setIsError(null)
    dispatch(actions.users.SearchForUsers({ [filter]: searchValue }))
    setSearchValue('')
  }

  const initiateSearchOnKeyDown = (e) =>
    e.keyCode === 13 && searchPeersHandler()

  const initiateOperation = (user) => {
    if (type === 'reports') {
      setInputPlaceholder(user['name'])
      setPeerInfo(user)
      setPeers(null)
      setIsPeerSelectedForPrinting(true)
      return
    }
    if (user.color.toLocaleLowerCase() !== '#ec4a0d') {
      setPeerInfo(user)
      return
    } else setIsError(t('no-operation-with-red'))
  }

  useEffect(() => {
    users && setPeers(users)
  }, [users])

  useEffect(() => {
    setInputPlaceholder(placeholder[filter])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    return () => {
      dispatch({ type: constants.users.USERS_SEARCH_RESET })
    }
  }, [])

  useEffect(() => {
    error && setIsError(error)
  }, [error])

  const inputClasses = classnames(style.search__input, {
    [style.search__input_ar]: lang === 'ar',
  })

  return (
    <div className={inputClasses}>
      <input
        type='text'
        placeholder={inputPlaceholder}
        value={searchValue}
        onFocus={() => setPeers(mutuals)}
        onKeyDown={initiateSearchOnKeyDown}
        onBlur={() => !isListFocused && setPeers(null)}
        onChange={(e) => setSearchValue(e.target.value)}
      />
      {type === 'reports' && isPeerSelectedForPrinting && (
        <span className={style['search__report--selected']}>
          <Check />
        </span>
      )}
      <button onClick={searchPeersHandler}>{t('search')}</button>

      {loading || isError ? (
        <ul className={style.search__data} style={{ overflow: 'unset' }}>
          <li style={{ border: 0 }}>
            {loading ? (
              <Loader center size='4' options={{ animation: 'grow' }} />
            ) : (
              isError && (
                <p style={{ color: 'red', fontSize: '1.4rem' }}>{isError}</p>
              )
            )}
          </li>
        </ul>
      ) : (
        peers?.length !== 0 && (
          <ul
            className={style.search__data}
            onMouseEnter={() => setIsListFocused(true)}
            onMouseLeave={() => setIsListFocused(false)}
          >
            {peers?.map((peer) => (
              <li key={peer._id} onClick={() => initiateOperation(peer)}>
                <img src={`/api/files/${peer.image}`} alt='second peer' />
                <p>{lang === 'ar' ? peer.arabicName : peer.name}</p>
                <StatusLabel color={peer.color} />
                {peer.isEmployee && <CompanyLabel name={peer.company.name} />}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

export default Input
