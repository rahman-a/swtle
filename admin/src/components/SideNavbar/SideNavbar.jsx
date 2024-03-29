import React, { useState, useRef, useEffect } from 'react'
import style from './style.module.scss'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import classnames from 'classnames'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import actions from '@/src/actions'
import { Loader } from '@/src/components'
import {
  Dashboard,
  Cogs,
  File,
  Logout,
  AddressCard,
  Globe,
  CashRegister,
  HandshakeSlash,
  Help,
  Wrench,
} from '@/src/icons'

const SideNavbar = ({
  showSideMenu,
  loadingState,
  language,
  changeLanguageHandler,
  setSideMenu,
}) => {
  const navigate = useNavigate()
  const [isReportMenu, setIsReportMenu] = useState(false)
  const reportRef = useRef(null)
  const { loading, error, isLogout } = useSelector((state) => state.logout)
  const { staff } = useSelector((state) => state.login)
  const dispatch = useDispatch()
  const lang = i18next.language
  const { t } = useTranslation()

  const navbarLogoutClasses = classnames(style.navbar__menu_item_logout, {
    [style.navbar__menu_item_logout_ar]: language === 'ar',
  })

  const navbarMenuItemClasses = classnames(
    style.navbar__menu_item,
    style.navbar__menu_item_lang
  )

  const logoutHandler = (e) => {
    e.stopPropagation()
    if (!loading) {
      dispatch(actions.admin.logout())
    }
  }

  const toggleMenuStyle = () => {
    let style = {
      left: showSideMenu ? 0 : '-30rem',
    }
    if (lang === 'ar') {
      style = { right: showSideMenu ? 0 : '-30rem' }
    }

    return style
  }

  useEffect(() => {
    if (isLogout) {
      navigate('/login')
    }
    return () => setSideMenu(false)
  }, [isLogout])

  const showReportsMenu = (e) => {
    e.stopPropagation()
    if (!isReportMenu) {
      const menuHeight = reportRef.current.getBoundingClientRect().height
      reportRef.current.parentNode.style.height = `${menuHeight}px`
      setIsReportMenu(true)
    } else {
      reportRef.current.parentNode.style.height = 0
      setIsReportMenu(false)
    }
  }

  return (
    <>
      {error && (
        <div
          className={style.navbar__logout_alert}
          style={{ left: error ? '1rem' : '-25rem' }}
        >
          <p>{error}</p>
        </div>
      )}

      <div className={style.navbar__menu} style={toggleMenuStyle()}>
        <ul className={style.navbar__menu_list}>
          <li className={style.navbar__menu_item}>
            <div onClick={() => navigate('/')}>
              <span>
                <Dashboard />
              </span>
              <span>{t('dashboard')}</span>
            </div>
          </li>
          {staff.roles.includes('manager') && (
            <li className={style.navbar__menu_item}>
              <div onClick={() => navigate('/operations')}>
                <span>
                  <Cogs />
                </span>
                <span>{t('operation')}</span>
              </div>
            </li>
          )}
          {staff.roles.includes('manager') && (
            <li className={style.navbar__menu_item}>
              <div onClick={showReportsMenu}>
                <span>
                  <File />
                </span>
                <span>{t('reports')}</span>
              </div>
              {/* ///////////////////////////////////// */}
              <ul className={style.navbar__menu_reports}>
                <div ref={reportRef}>
                  <li
                    className={style.navbar__menu_reports_item}
                    onClick={() => navigate('/reports/active')}
                  >
                    <span>
                      <CashRegister />
                    </span>
                    <span>{t('active-reports')}</span>
                  </li>
                  <li
                    className={style.navbar__menu_reports_item}
                    onClick={() => navigate('/reports/closed')}
                  >
                    <span>
                      <HandshakeSlash />
                    </span>
                    <span>{t('closed-reports')}</span>
                  </li>
                </div>
              </ul>
              {/* ///////////////////////////////////// */}
            </li>
          )}
          {(staff.roles.includes('manager') || staff.roles.includes('hr')) && (
            <>
              <li className={style.navbar__menu_item}>
                <div onClick={() => navigate('/members')}>
                  <span>
                    <AddressCard />
                  </span>
                  <span>{t('members')}</span>
                </div>
              </li>
              <li className={style.navbar__menu_item}>
                <div onClick={() => navigate('/provider')}>
                  <span>
                    <Wrench />
                  </span>
                  <span>{t('provider')}</span>
                </div>
              </li>
            </>
          )}
          {(staff.roles.includes('manager') || staff.roles.includes('cs')) && (
            <li className={style.navbar__menu_item}>
              <div onClick={() => navigate('/support')}>
                <span>
                  <Help />
                </span>
                <span>{t('support')}</span>
              </div>
            </li>
          )}
          <li className={style.navbar__menu_item}>
            <div onClick={logoutHandler}>
              {loading && (
                <span className={style.navbar__menu_item_loading}>
                  <Loader center size='5' options={{ animation: 'border' }} />
                </span>
              )}

              <span className={navbarLogoutClasses}>
                <Logout />
              </span>
              <span>{t('logout')}</span>
            </div>
          </li>
          <li className={navbarMenuItemClasses}>
            <div>
              {loadingState && (
                <span className={style.navbar__menu_item_loading}>
                  <Loader center size='5' options={{ animation: 'border' }} />
                </span>
              )}
              <span>
                <Globe />
              </span>
              <span className={style.navbar__menu_item_flag}>
                {language === 'ar' ? (
                  <img
                    onClick={(e) => changeLanguageHandler(e, 'en')}
                    src='/images/usa-flag.jpg'
                    alt='usa flag'
                  />
                ) : (
                  <img
                    onClick={(e) => changeLanguageHandler(e, 'ar')}
                    src='/images/uae-flag.png'
                    alt='uae flag'
                  />
                )}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </>
  )
}

export default SideNavbar

/**
 *
 */
