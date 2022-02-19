import React, {useState, useRef, useEffect} from 'react'
import {useSelector, useDispatch} from 'react-redux'
import {Alert} from 'react-bootstrap'
import {v4 as uuidv4} from 'uuid'
import {Input, SideButton, Button} from '../../components'
import {EnvelopOpen, Key, Fingerprint} from '../../icons'
import constants from '../../constants'
import actions from '../../actions'

const Credential = ({setStep}) => {
    const [moreEmail, setMoreEmail] = useState(1)
    const [username, setUsername] = useState('')
    const [emails, setEmails] = useState([])
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isAgree, setIsAgree] = useState(false)
    const [errors, setErrors] = useState('')
    const [inputFocus, setInputFocus] = useState(false)
    const [usernameFocus, setUsernameFocus] = useState(true)
    const inputRef = useRef()
    const userRef = useRef()
    const {loading, error, userId} = useSelector(state => state.registerCredential)
    const dispatch = useDispatch()
    
   
    
    
    const submitHandler = _ => {  
        if(isFormValid()) {
            const allEmails = emails.map((email, idx) => {
                return {isPrimary: idx === 0, email}
            })
            
            const info = {
                username,
                emails:allEmails,
                password
            }
            
            setErrors('')
            dispatch(actions.users.registerCredential(info))
        }
       
    }

    const isFormValid = _ => {
        if(!username) {
            setErrors('Please type a unique username')
            return false
        }
        
        if(emails.length === 0) {
            setErrors('Provide at least one E-mail')
            return false
        }

        if(!password) {
            setErrors('Please Provide a Password')
            return false
        }

        if(password !== confirmPassword) {
            setErrors('Password doesn\'t match')
            return false
        }

        if(!isAgree) {
            setErrors('Please Agree the terms & conditions')
            return false
        }

        return true

    }


    
    const setEmailsHandler = (e, idx) => {
        const emailsValues = [...emails]
        emailsValues[idx] = e.target.value
        setEmails(emailsValues)
        setInputFocus(true)
        setUsernameFocus(false)
    }

    const closeAlertHandler = () => {
        dispatch({type:constants.users.REGISTER_CREDENTIAL_RESET})
        setErrors('')
    }   

 

    const addMoreEmailHandler = _ => {
        setMoreEmail(prev => prev + 1)
    }

    const removeMoreEmailHandler = where => {
        setMoreEmail(prev => prev - 1)
    }

    useEffect(() => {
        window.scrollTo(0,0)
    }, [errors])

    useEffect(() => {
        inputRef.current.focus()
        inputFocus 
        && !usernameFocus 
        && setInputFocus(false)
        usernameFocus && userRef.current.focus()
        error && setErrors(error)
        userId && setStep(2)
    }, [inputFocus, error, userId])
    
    return (
        <>
            {/* Alerts */}
            {
                errors && <Alert 
                key={uuidv4()} 
                variant='danger' 
                onClose={closeAlertHandler}
                dismissible>
                    {errors}
                </Alert>
            }


            {/* INPUTS TO ENTER USERNAME*/}
            <Input
            type='text'
            placeholder='choose a unique username'
            name='username'
            label='choose a unique username'
            icon={<Fingerprint/>}
            custom={{marginBottom:'3rem'}}
            value={username}
            inputRef={userRef}
            onChange={(e) => setUsername(e.target.value)}
            />
            
            {/* INPUTS TO ENTER Emails*/}
            {
                [...Array(moreEmail)].map((_, idx) => {
                    return<div key={uuidv4()} style={{
                        display:'flex',
                        alignItems:'center'
                    }}> 
                        <Input
                            name='email'
                            id={`email-${idx + 1}`}
                            placeholder={idx > 0 ? 'Add Another E-mail' :'Main E-mail Address'}
                            label={idx > 0 ? 'Add Another E-mail' :'Main E-mail Address'}
                            type='email'
                            icon={<EnvelopOpen/>}
                            custom={{marginBottom:'3rem'}}
                            value={emails[idx] ? emails[idx]: ''}
                            inputRef={inputRef}
                            disabled={moreEmail > idx + 1}
                            onChange={(e) => setEmailsHandler(e, idx)}
                            
                        />
                        {moreEmail === (idx + 1) 
                        && <SideButton 
                        text='another email' 
                        handler={addMoreEmailHandler}/>}
                        {moreEmail === (idx + 1) && moreEmail > 1 
                        && <SideButton 
                        minus 
                        text='remove email' 
                        handler={removeMoreEmailHandler}/>}
                    </div>
                    
                }) 
            }
            
            <Input
                name='password'
                placeholder='Password'
                label='Password'
                type='password'
                icon={<Key/>}
                value={password}
                custom={{marginBottom:'3rem'}}
                onChange={(e) => setPassword(e.target.value)}
            />
          
          <Input
                name='confirmPassword'
                placeholder='Confirm Password'
                label='Confirm Password'
                type='password'
                icon={<Key/>}
                value={confirmPassword}
                custom={{marginBottom:'3rem'}}
                onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div style={{
                display:'flex',
                alignItems:'center',
                textAlign: 'start',
                marginTop: '-2rem',
                color: '#fff',
                transform: 'translateX(10px)'
            }}>
                <input 
                type="checkbox" 
                name='isAgree' 
                style={{marginRight:'1rem'}}
                onChange={(e) => setIsAgree(!isAgree)}/>
                <label style={{
                    fontSize:'1.4rem',
                }} htmlFor="terms">I Agree on <a href="#" style={{color:'#B1D0E0'}}>Terms & Condition</a></label>
            </div>
          <Button 
          value='next' 
          handler={submitHandler} 
          loading={loading && loading}/> 
        </>
    )
}

export default Credential