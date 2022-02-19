import constants from "../constants";
import api from '../api'

const listNotification = (query) => async (dispatch) => {
    dispatch({type: constants.notifications.LIST_NOTIFICATIONS_REQUEST}) 
    try {
        const {data} = await api.notifications.index(query)
        dispatch({
            type: constants.notifications.LIST_NOTIFICATIONS_SUCCESS,
            notifications: data.notifications,
            count:data.count,
            nonRead:data.countNonRead
        })
    } catch (error) {
        dispatch({
            type:constants.notifications.LIST_NOTIFICATIONS_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const newNotification = (info) => async (dispatch) => {
    dispatch({type: constants.notifications.NEW_NOTIFICATION_REQUEST}) 

    try {
        const {data} = await api.notifications.new(info)
        dispatch({
            type: constants.notifications.NEW_NOTIFICATION_SUCCESS,
            payload: data.message
        })
    } catch (error) {
        dispatch({
            type:constants.notifications.NEW_NOTIFICATION_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const updateNotificationState = (id) => async (dispatch, getState) => {
    dispatch({type: constants.notifications.UPDATE_NOTIFICATION_REQUEST}) 

    try {
        const {data} = await api.notifications.updateState(id) 
        
        let {notifications, count, nonRead} = getState().listNotifications 
        
        if(notifications) {       
            let targetNotification = notifications.find(notification => notification._id === id) 
            targetNotification.isRead = data.isRead 
            let filteredNotifications = notifications.filter(notification => notification._id !== id) 
            filteredNotifications = [targetNotification, ...filteredNotifications]
            let countNonRead = data.isRead ? nonRead - 1 : nonRead + 1 
            
            dispatch({
                type: constants.notifications.LIST_NOTIFICATIONS_SUCCESS,
                notifications: filteredNotifications,
                count,
                nonRead:countNonRead
            })
        }   
        
        dispatch({
            type: constants.notifications.UPDATE_NOTIFICATION_SUCCESS,
            payload: data.message
        })

    } catch (error) {
        dispatch({
            type:constants.notifications.UPDATE_NOTIFICATION_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const pushNotification = () => async (dispatch, getState) => {
    dispatch({type: constants.notifications.PUSH_NOTIFICATIONS_REQUEST}) 

    try {
        const {data} = await api.notifications.push()
        
        let {notifications} = getState().listNotifications
        let {nonRead} = getState().listNotifications
        if(notifications) {
            notifications = [...data.notifications, ...notifications]
            const {count} = getState().listNotifications
            dispatch({
                type: constants.notifications.LIST_NOTIFICATIONS_SUCCESS,
                notifications,
                count,
                nonRead: nonRead + data.notifications.length
            })
        }else {
            dispatch({
                type: constants.notifications.LIST_NOTIFICATIONS_SUCCESS,
                notifications:data.notifications,
                count:data.notifications.length,
                nonRead: data.notifications.length
            })
        }

        dispatch({
            type: constants.notifications.PUSH_NOTIFICATIONS_SUCCESS,
            payload:data.notifications
        })
    } catch (error) {
        dispatch({
            type:constants.notifications.PUSH_NOTIFICATIONS_FAIL, 
            payload:error.response && error.response.data.message 
        })
    }
}

const actions = {
    listNotification,
    newNotification,
    pushNotification,
    updateNotificationState
}

export default actions 