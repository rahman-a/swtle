import React, {useState} from 'react'
import style from './style.module.scss'
import {CopyToClipboard} from 'react-copy-to-clipboard';
import {useSelector}  from 'react-redux'
import {Currency} from '../../components'
import {Copy, Check, Reader} from '../../icons'
import Description from './Description';

const Row = ({record, idx, due, op, closed}) => {
    const [isCopied, setIsCopied] = useState(false)
    const [isDescribeOn, setIsDescribeOn] = useState(false)
    const {user} = useSelector(state => state.login)
    
    const copyIdHandler = _ => {
        setIsCopied(true)
        setTimeout(() => {
            setIsCopied(false)
        },500)
    }


    const peerType =  _ => {
        
        const type = record.initiator?.user?._id === user._id 
                  || record.operation?.initiator?._id === user._id
        ? record.peer?.type || record.operation.peer.type
        : record.peer?.user?._id === user._id || record.operation.peer._id === user._id
        ? record.initiator?.type ||record.operation.initiator.type
        : 'N/A'

        return type
    }

    const defineValue = (type, field) => {
        
        let value = 0
        if(type === 'credit' && field === 'credit') {
            if(record.credit){
                value = record.credit
            } else if (record.debt) {
                value = record.debt
            }else if (record.initiator?.value) {      
                value = record.initiator?.value
            } else {
                value = record.peer?.value
            }
            
        }else {
            value = '0.0'
        }

        if(type === 'debt' && field === 'debt') {
            if(record.debt){
                value = record.debt
            } else if (record.credit) {
                value = record.credit
            }else if (record.initiator?.value) {
                value = record.initiator?.value
            } else {
                value = record.peer?.value
            }
        }else if (field === 'debt') {
            value = '0.0'
        }
        return value
    }

    
    const getStateColor = state => { 
        const states = {
            pending:'#FBFCD4',
            approved:'#C7FFCE',
            decline:'#FCD4DB',
            active:'#C7FFCE',
            closed:'#FCD4DB'
        }
        return states[state]
    }
    
    return (
        
        <>
        <Description
        note={record.note || record.operation.note}
        isDescribeOn={isDescribeOn} 
        setIsDescribeOn={setIsDescribeOn}
        />
        
        <tr className={style.row}>
            <td>{idx + 1}</td>
                                    
            {/* Operation Id */}
            <td className={style.row__id}>
                <CopyToClipboard text={record._id} onCopy={copyIdHandler}>
                    <span>
                    {isCopied ? <Check/> :<Copy/>} 
                    </span>
                </CopyToClipboard>
                { record._id.substring(0,12) + '...' }
            </td>
            
            {/* Operation Second Peer or Initiator Name */}
            <td style={{textTransform:'capitalize', position:'relative'}}>
                <span className={style.row__label}
                style={{
                    backgroundColor: peerType() === 'debt' 
                    ? '#198754' 
                    : '#1a374d'
                }}>
                    {
                        (record.peer?.user?._id || record.operation.peer._id) === user._id
                        ? record.initiator?.type || record.operation.initiator.type 
                        : record.peer?.type || record.operation.peer.type
                    }
                </span>
                { (record.peer?.user?._id || record.operation.peer._id) === user._id
                ? record.initiator?.user?.fullNameInEnglish || record.operation.initiator.fullNameInEnglish
                : record.peer?.user?.fullNameInEnglish || record.operation.peer.fullNameInEnglish
                }
            </td>
            
            {/* Operation Second Peer or Initiator Photo */}
            <td style={{padding:'1rem 0'}}>
                <img 
                src={
                    (record.peer?.user?._id || record.operation.peer._id) === user._id 
                    ?`/api/files/${record.initiator?.user?.avatar || record.operation.initiator.avatar}`
                    :`/api/files/${record.peer?.user?.avatar || record.operation.peer.avatar}`
                } 
                alt="second peer" 
                className={style.row__photo}/> 
            </td>
            
            {/* Operation Description */}
            <td style={{padding: (record.note || record.operation.note) ? '0' :'2.5rem 0'}}>
                {record.note || record.operation.note
                ? <p className={style.row__desc}> 
                    <span onClick={() => setIsDescribeOn(true)}><Reader/></span> 
                    <i style={{lineBreak:'anywhere', padding:'0 0.8rem'}}>
                        {
                            record.note
                            ? record.note?.substring(0, 35) + '...' 
                            : record.operation.note.substring(0,35) + '...' 
                        }
                    </i> 
                  </p>  
                : 'N/A'}
            </td>

            {/* Creditor amount value*/}
            <td style={{textTransform:'capitalize'}}> { defineValue(peerType(), 'credit') } </td>
            
            {/* Debtor amount value*/}
            <td> {defineValue(peerType(), 'debt')} </td>

            {/* Operation Currency [usd, euro, aed]*/}
            <td style={{textAlign:'start', paddingLeft:'1rem'}}>
                <Currency currency={record.currency}/> 
            </td>
            
            {/* Operation State [pending, approved, declined]*/}
           
           { op && <td style={{
                backgroundColor:getStateColor(record.state),
                textTransform:'uppercase'
                }}>
                {record.state}
            </td> }
            
            {/* Operation Due Date */}
           {(due || closed) 
           && <td
           style={{backgroundColor: record.paymentDate ? '#FCD4DB' :'#ff'}}> 
            {
            record.paymentDate
            ? new Date(record.paymentDate).toLocaleDateString()
            : record.dueDate
            ? new Date(record.dueDate).toLocaleDateString()
            : 'N/A'} 
            </td>
           } 
        </tr> 
    </>
    )
}

export default Row