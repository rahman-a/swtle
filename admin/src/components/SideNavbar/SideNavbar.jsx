import React, {useState, useRef, useEffect} from 'react'
import style from './style.module.scss'
import { useNavigate } from 'react-router-dom'
import {useSelector, useDispatch} from 'react-redux'
import actions from '../../actions'
import {Loader} from '../../components'

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
    Wrench
} from '../../icons'


const SideNavbar = ({
    showSideMenu, 
    loadingState,
    language, 
    changeLanguageHandler,
    setSideMenu 
    }) => {
    const navigate = useNavigate()
    const [isReportMenu, setIsReportMenu] = useState(false)
    const reportRef = useRef(null)
    const {loading, error, isLogout}  = useSelector(state => state.logout)
    const {staff}  = useSelector(state => state.login)
    const dispatch = useDispatch()


    const logoutHandler = e => {
        e.stopPropagation()
        if(!loading) {
            dispatch(actions.admin.logout())
        }
    }
    
    useEffect(() => {
        if(isLogout) {
            setSideMenu(false)
            navigate('/login')
        } 
    },[isLogout])

    const showReportsMenu = e => {
        e.stopPropagation()
        if(!isReportMenu) {
            const menuHeight = reportRef.current.getBoundingClientRect().height 
            reportRef.current.parentNode.style.height = `${menuHeight}px`
            setIsReportMenu(true) 
        }else {
            reportRef.current.parentNode.style.height = 0 
            setIsReportMenu(false)
        }
    }

    return (
        <>
        {error 
        && <div className={style.navbar__logout_alert}
        style={{left:error ?'1rem':'-25rem'}}>
            <p>This is Error From Server</p>
        </div> }

        <div className={style.navbar__menu}
        style={{left: showSideMenu ? '0' : '-30rem'}}>
            <ul className={style.navbar__menu_list}>
                <li className={style.navbar__menu_item}
                >
                    <div onClick={() => navigate('/dashboard')}>
                        <span>
                            <Dashboard/>
                        </span>
                        <span>
                            Dashboard
                        </span>
                    </div>
                </li>
                <li className={style.navbar__menu_item}
                >
                    <div onClick={() => navigate('/operations')}>
                        <span>
                            <Cogs/>
                        </span>
                        <span>
                            Operations
                        </span>
                    </div>
                </li>
                <li className={style.navbar__menu_item}
                >
                    <div onClick={showReportsMenu}>
                        <span>
                            <File/>
                        </span>
                        <span>
                            Reports
                        </span>
                    </div>
                    {/* ///////////////////////////////////// */}
                    <ul className={style.navbar__menu_reports}>
                        <div ref={reportRef}>
                            <li className={style.navbar__menu_reports_item}
                            onClick={() => navigate('/reports/active')}>
                                <span>
                                    <CashRegister/>
                                </span>
                                <span>
                                    Active Reports
                                </span>
                            </li>
                            <li className={style.navbar__menu_reports_item}
                            onClick={() => navigate('/reports/closed')}>
                                <span>
                                    <HandshakeSlash/>
                                </span>
                                <span>
                                    closed Reports
                                </span>
                            </li>
                        </div>
                    </ul>
                    {/* ///////////////////////////////////// */}
                </li>
                <li className={style.navbar__menu_item}
                >
                   <div onClick={() => navigate('/members')}>
                        <span>
                            <AddressCard/>
                        </span>
                        <span>
                            Members
                        </span>
                   </div>
                </li>
                {
                    (staff.roles.includes('manager') || staff.roles.includes('hr')) && 
                    <li className={style.navbar__menu_item}>
                        <div onClick={() => navigate('/provider')}>
                            <span>
                                <Wrench/>
                            </span>
                            <span>
                                Provider
                            </span>
                        </div>
                    </li>  
                }
                {
                    (staff.roles.includes('manager') || staff.roles.includes('cs')) && 
                    <li className={style.navbar__menu_item}>
                        <div onClick={() => navigate('/support')}>
                            <span>
                                <Help/>
                            </span>
                            <span>
                                Support
                            </span>
                        </div>
                    </li>  
                }
                <li className={style.navbar__menu_item}
                >
                    <div onClick={logoutHandler}>
                       {loading && <span className={style.navbar__menu_item_loading}>
                            <Loader center size='5' options={{animation:'border'}}/>
                        </span>} 
                        <span className={style.navbar__menu_item_logout}>
                            <Logout/>
                        </span>
                        <span>
                            Logout
                        </span>
                    </div>
                </li>
                <li className={`
                ${style.navbar__menu_item} 
                ${style.navbar__menu_item_lang}
                `}>
                    <div>
                        {loadingState && <span className={style.navbar__menu_item_loading}>
                            <Loader center size='5' options={{animation:'border'}}/>
                        </span>}
                        <span>
                            <Globe/>
                        </span>
                        <span className={style.navbar__menu_item_flag}>
                        {language === 'ar' 
                            ? <img 
                            onClick={(e) => changeLanguageHandler(e, 'en')} 
                            src="/images/usa-flag.jpg" 
                            alt="usa flag" />
                            :<img 
                            onClick={(e) => changeLanguageHandler(e, 'ar')} 
                            src="/images/uae-flag.png" 
                            alt="uae flag" />}     
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