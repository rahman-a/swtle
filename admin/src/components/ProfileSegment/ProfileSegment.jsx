import React, {useEffect, useState} from 'react'
import style from './style.module.scss'
import {v4 as uuidv4} from 'uuid'
import {Badge, Button, Modal, Alert} from 'react-bootstrap'
import {useSelector, useDispatch} from 'react-redux'
import {Loader} from '../../components'
import labels from '../../config/label'
import messages from '../../config/messages'
import actions from '../../actions'

const Country = ({country}) => {
    return (
        <span style={{flexDirection:'row'}}>
            <img 
            src={country.image} 
            alt={country.name} 
            width='25'
            style={{marginRight:'1rem'}}/>
            {`${country.abbr} ${country.name}`}
        </span>
    )
}

const ToggleAccount = ({isActive, setIsActive, memberId}) => {
    
    const dispatch = useDispatch()
    const {loading, isConfirmed} = useSelector(state => state.toggleUser)
    
    const setMemberActivation = e => {
        dispatch(actions.admin.toggleUser(memberId))
    }
    
    useEffect(() => {
    setIsActive(isConfirmed)
    }, [isConfirmed])

    return (
        <div className={style.segment__toggle}>
           {loading && <Loader size='5' center options={{animation:'border'}}/>} 
            <strong style={{color:'red'}}> <i>  Not Active </i> </strong>
            
            <div className={style.segment__toggle_state}>
                <label htmlFor="state">
                    {loading && <span className={style.segment__toggle_backdrop}></span> }
                    <span className={isActive ? style.segment__toggle_active :''}></span>
                </label>

                <input 
                disabled={loading ? true : false}
                type="checkbox" 
                id='state' 
                name='state'
                onChange={setMemberActivation}/>

            </div>

            <strong style={{color:'green'}}> <i> Active </i>  </strong>

        </div>
    )
}

const MemberColorCode = ({color, memberId}) => {
    const [colorToggle, setColorToggle] = useState(false);
    const [code, setCode] = useState(null)
    const [label, setLabel] = useState(null) 
    const [isReport, setIsReport] = useState(false)
    const [reportId, setReportId] = useState('')
    const dispatch = useDispatch()
    const {loading, error, message} = useSelector(state => state.userColorCode)

    const colorCodes = {
        red:'#EC4A0D',
        yellow:'#C7E81D',
        green:'#037A12'
    }

    const changeColorHandler = _ => {
        let data;

        const color = colorCodes[code] 
        
        if(color === '#037A12') {
            data = {code:color}
        }else  {
            
            const labelTitle = labels.find(lb => lb.label === label)
            const message = reportId 
            ? messages[label](reportId) 
            : messages[label]
    
            data = {
                code:color,
                state:{
                    label:{en: labelTitle['en'], ar:labelTitle['ar']},
                    message
                }
            }
            if(reportId) {
                data.state.report = reportId
            }
        }
        dispatch(actions.admin.userColorCode(memberId, data))
    }

    const setLabelValue = e => {
        setLabel(e.target.value) 
        const type = labels.find(lb => lb.label === e.target.value).type 
        type === 'payment' 
        ? setIsReport(true) 
        : setIsReport(false)
    }

    return (
        <>
           <Modal show={colorToggle} onHide={() => setColorToggle(false)}> 
                <Modal.Header> Change Member Color Code </Modal.Header>
                
                <Modal.Body>
                   
                   { message && <Alert variant='success' className='text-center'> 
                        {message}
                    </Alert> 
                   }

                    { error && <Alert variant='danger' className='text-center'> 
                        {error}
                    </Alert> 
                   }

                  {loading && <div style={{textAlign:'-webkit-center'}}>
                        <Loader size='5' options={{animation:'border'}}/>
                   </div> }

                    <div className={style.segment__color_change}>
                        <div className={style.segment__color_types}>
                            <h3>Select Color</h3>
                            
                            <span onClick={() => setCode('green')}
                            className={code === 'green' ? style.segment__color_types_select :''}> 
                                Green 
                            </span>
                            
                            <span onClick={() => setCode('yellow')}
                            className={code === 'yellow' ? style.segment__color_types_select :''}>
                                Yellow
                            </span>
                            
                            <span onClick={() => setCode('red')}
                            className={code === 'red' ? style.segment__color_types_select :''}>
                                Red
                            </span>

                        </div>
                        
                        <div className={style.segment__color_state}>
                            <h3> Reason Of Color Change </h3> 
                            <select name="label" id="label"
                            onChange={(e) => setLabelValue(e)}
                            style={{fontSize:'1.4rem'}}>
                                <option value=""> .... </option>
                                {
                                    labels.map(label => (
                                        <option 
                                        key={label.label} 
                                        value={label.label}> 
                                            {label.en} 
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                      {
                        isReport && 
                            <div className={style.segment__color_state}>
                                <h3> Enter The Related Report Id </h3>  
                                <input 
                                type="text"  
                                name='report' 
                                placeholder='Enter The Report Id'
                                value={reportId}
                                onChange={(e) => setReportId(e.target.value)}
                                className={style.segment__color_report}/>
                            </div>
                      }  
                    </div>
                </Modal.Body>
                
                <Modal.Footer>   
                    <Button variant='success' size='lg'
                    onClick={changeColorHandler}> 
                        YES, Change Color 
                    </Button>

                    <Button variant='danger' size='lg'
                    onClick={() => setColorToggle(false)}> 
                        NO, Close 
                    </Button>

                </Modal.Footer>
            </Modal>

            <div className={style.segment__color}>
                <div className={style.segment__color_block}
                style={{backgroundColor:color}}></div>

                <Button variant='warning'
                onClick={() => setColorToggle(true)}> Change Color </Button>
            </div>
        </>
    )
}


const ProfileSegment = ({
    title, 
    text, 
    type, 
    placeholder, 
    isConfirmed, 
    memberId, 
    color
}) => {
    
    const [isActive, setIsActive] = useState(false)

    useEffect(() => {
        setIsActive(isConfirmed)
    },[isConfirmed])

    
    return (
        <div className={style.segment}>  
            <h3> {title} </h3>
            <p style={{display: placeholder ? 'block' : 'flex'}}>
                {
                  placeholder 
                  ? <Badge bg='danger'>Not Provided</Badge>
                  : (type === 'email' || type === 'phones')
                  ? text.map(t => <span key={t._id}>{t.email || t.phone}</span>)
                  : type === 'outPhones' && text
                  ? text.map(t => <span key={uuidv4()}>{t}</span>)
                  : type === 'country'
                  ? <Country country={text}/>
                  : type === 'toggle'
                  ? <ToggleAccount isActive={isActive} setIsActive={setIsActive} memberId={memberId}/>
                  : type === 'color'
                  ? <MemberColorCode color={color} memberId={memberId}/>
                  : text
                }
            </p>
        </div>
    )
}

export default ProfileSegment