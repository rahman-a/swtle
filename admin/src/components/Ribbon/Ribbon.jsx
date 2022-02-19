import React, {useState} from 'react'
import style from './style.module.scss'
import {Modal} from 'react-bootstrap'
import {HeaderAlert} from '../../components'
import {Info} from '../../icons'
import {v4 as uuidv4} from 'uuid'
import {renderStateMessage} from '../../config/stateMessage'

const Ribbon = ({color, states}) => {
    const [isStates, setIsStates] = useState(false) 
    
    return (
        <>
            <Modal show={isStates} onHide={() => setIsStates(false)}>
                <ul className={style.ribbon__states}>
                    {
                        states.length > 0
                        ? states.reverse().map(state => <li key={uuidv4()}>
                            {renderStateMessage(state.message['en'], style.ribbon__report)}
                        </li>)
                        : <HeaderAlert size='2' text='Every things is OK'/>
                    }
                </ul>
            </Modal>
            <div className={style.ribbon}>
                <div className={style.ribbon__stripe} style={{backgroundColor:color}}></div>
                <span onClick={() => setIsStates(true)}> 
                    <Info/> 
                </span>
            </div>
        </>
    )
}


export default Ribbon