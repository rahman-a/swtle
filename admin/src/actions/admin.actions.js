import constants from "../constants";
import api from '../api'

const login = (info) => async (dispatch) => {
    dispatch({type:constants.admin.ADMIN_LOGIN_REQUEST}) 

    try {
        const {data} = await api.admin.login(info) 
        localStorage.setItem('staff', JSON.stringify(data.staff))
        localStorage.setItem('expiryAdAt', JSON.stringify(data.expiryAdAt))
        dispatch({
            type:constants.admin.ADMIN_LOGIN_SUCCESS,
            staff:data.staff,
            isAuth:true
        })
    } catch (error) {
        dispatch({
            type:constants.admin.ADMIN_LOGIN_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const logout = () => async (dispatch) => {
    dispatch({type:constants.admin.ADMIN_LOGOUT_REQUEST}) 
    try {
        await api.admin.logout()
        localStorage.removeItem('staff')
        localStorage.removeItem('expiryAdAt')
        dispatch({type:constants.admin.ADMIN_LOGOUT_SUCCESS}) 
    } catch (error) {
        dispatch({
            type:constants.admin.ADMIN_LOGOUT_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const sendResetLink = (email) => async (dispatch) => {
    dispatch({type:constants.admin.SEND_RESET_LINK_REQUEST}) 
    try {
        const {data} = await api.admin.sendPasswordResetLink(email)
        dispatch({type: constants.admin.SEND_RESET_LINK_SUCCESS, payload: data.message})
    } catch (error) {
        dispatch({
            type:constants.admin.SEND_RESET_LINK_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const verifyAuthLink = (info) => async (dispatch) => {
    dispatch({type:constants.admin.VERIFY_AUTH_LINK_REQUEST}) 
    try {
        const {data} = await api.admin.verifyAuthLink(info)
        dispatch({type: constants.admin.VERIFY_AUTH_LINK_SUCCESS, payload: data.message})
    } catch (error) {
        dispatch({
            type:constants.admin.VERIFY_AUTH_LINK_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const members = (query) => async (dispatch) => {
    dispatch({type:constants.admin.USERS_LIST_REQUEST}) 
    try {
        const {data} = await api.admin.members(query)
        dispatch({
            type:constants.admin.USERS_LIST_SUCCESS,
            users:data.users,
            count:data.count
        })
    } catch (error) {
        dispatch({
            type:constants.admin.USERS_LIST_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const member = (id) => async (dispatch) => {
    dispatch({type: constants.admin.USER_DATA_REQUEST}) 

    try {
        const {data} = await api.admin.member(id)
        dispatch({
            type:constants.admin.USER_DATA_SUCCESS,
            payload:data.user
        })
    } catch (error) {
        dispatch({
            type:constants.admin.USER_DATA_FAIL,
            payload:error.response && error.response.data.message
        })
    }
}

const toggleUser = (id) => async (dispatch) => {
    dispatch({type: constants.admin.USER_TOGGLE_REQUEST}) 

    try {
        const {data} = await api.admin.toggle(id)
        dispatch({
            type:constants.admin.USER_TOGGLE_SUCCESS,
            payload:data.isConfirmed
        })
    } catch (error) {
        dispatch({
            type:constants.admin.USER_TOGGLE_FAIL,
            payload:error.response && error.response.data.message
        })
    }
}

const userColorCode = (id,info) => async (dispatch) => {
    dispatch({type: constants.admin.USER_COLOR_CHANGE_REQUEST}) 
    
    try {
        const {data} = await api.admin.color(id,info)
        dispatch({
            type:constants.admin.USER_COLOR_CHANGE_SUCCESS,
            payload:data.message
        })
    } catch (error) {
        dispatch({
            type:constants.admin.USER_COLOR_CHANGE_FAIL,
            payload:error.response && error.response.data.message
        })
    }
}

const deleteUser = (id) => async (dispatch) => {
    dispatch({type: constants.admin.USER_DELETE_REQUEST}) 

    try {
        const {data} = await api.admin.delete(id)
        dispatch({
            type:constants.admin.USER_DELETE_SUCCESS,
            payload:data.message
        })
    } catch (error) {
        dispatch({
            type:constants.admin.USER_DELETE_FAIL,
            payload:error.response && error.response.data.message
        })
    }
}


const actions = {
    login,
    logout,
    sendResetLink,
    verifyAuthLink,
    members,
    member,
    toggleUser,
    userColorCode,
    deleteUser
}

export default actions