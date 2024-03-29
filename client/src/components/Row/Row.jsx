// @ts-nocheck
import React, { useEffect, useState } from 'react'
import style from './style.module.scss'
import { Badge } from 'react-bootstrap'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import classnames from 'classnames'
import { useParams } from 'react-router-dom'
import Decision from './Decision'
import Chat from './Chat'
import {
  Currency,
  ChangeDue,
  Description,
  CloseReport,
  PayFine,
} from '@/src/components'
import {
  Copy,
  Check,
  Reader,
  HandshakeSlash,
  Times,
  Chat as ChatIcon,
  CashRegister,
} from '@/src/icons'
import {
  getUserData,
  getMemberName,
  getPeerId,
  getStateColor,
  isCurrentUserPeer,
  isCurrentUserCredit,
  formatFineAmount,
  peerType,
  defineValue,
  formatPaymentDate,
  isPeerUserEmployee,
} from '@/src/utils/table'

const Row = ({ record, idx, reports, due, op, closed }) => {
  const [isCopied, setIsCopied] = useState(false)
  const [isDescribeOn, setIsDescribeOn] = useState(false)
  const [isDueChange, setIsDueChange] = useState(false)
  const [isReportClose, setIsReportClose] = useState(false)
  const [isFine, setIsFine] = useState(false)
  const { user } = useSelector((state) => state.isAuth)
  const [userId, setUserId] = useState(null)
  const lang = i18next.language
  const { t } = useTranslation()
  const { id } = useParams() // Employee Id
  const isCredit = isCurrentUserCredit(record, op, userId)
  const isPeer = isCurrentUserPeer(record, userId)
  const memberName = getMemberName(record, userId, lang)
  const peer_Type = peerType(record, userId)
  const peer_Id = getPeerId(record, userId)
  const creditorData = getUserData(record, 'credit')
  const debtorData = getUserData(record, 'debt')
  const creditValue = defineValue(record, peer_Type, 'credit')
  const debtValue = defineValue(record, peer_Type, 'debt')
  const fineAmount = formatFineAmount(debtorData.delayedFine)
  const finePaymentDate = formatPaymentDate(debtorData.delayedFine?.paidAt)
  const recordPaymentDate = formatPaymentDate(record.paymentDate)
  const { isEmployee, company } = isPeerUserEmployee(record, userId)

  const copyIdHandler = (_) => {
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
    }, 500)
  }
  const rowCloseClasses = classnames(style.row__close, {
    [style.row__close_disabled]: !isCredit || id,
  })

  const fineClasses = classnames({
    [style.row__fine]: fineAmount && !id,
    [style.row__fine_employee]: id,
  })
  useEffect(() => {
    id ? setUserId(id) : setUserId(user._id)
  }, [id])
  return (
    <>
      <PayFine
        isFine={isFine}
        setIsFine={setIsFine}
        fine={{
          amount: debtorData.delayedFine?.amount,
          report: debtorData.delayedFine?.report,
          currency: record.currency.abbr,
        }}
      />
      <Description
        note={record?.note || record?.operation?.note}
        isDescribeOn={isDescribeOn}
        setIsDescribeOn={setIsDescribeOn}
      />

      <ChangeDue
        isDueChange={isDueChange}
        setIsDueChange={setIsDueChange}
        id={record._id}
        op={op}
      />

      <CloseReport
        isReportClose={isReportClose}
        setIsReportClose={setIsReportClose}
        report={record._id}
      />

      <tr className={style.row}>
        <td>{idx + 1}</td>

        {/* Operation Id */}
        <td className={style.row__id}>
          <CopyToClipboard text={record._id} onCopy={copyIdHandler}>
            <span>{isCopied ? <Check /> : <Copy />}</span>
          </CopyToClipboard>
          {record._id.substring(0, 12) + '...'}
        </td>

        {/* Operation Second Peer or Initiator Name */}
        <td className={style.row__name}>
          <span
            className={style.row__label}
            style={{
              backgroundColor: peer_Type === 'debt' ? '#198754' : '#1a374d',
            }}
          >
            {isPeer
              ? t(record.initiator?.type) || t(record.operation.initiator.type)
              : t(record.peer?.type) || t(record.operation.peer.type)}
          </span>
          {!id && <Chat id={peer_Id} />}
          {memberName}
        </td>

        {/* Operation Second Peer or Initiator Photo */}
        <td className={style.row__photo} style={{ padding: '1rem 0' }}>
          <span
            style={{
              backgroundColor: isPeer
                ? record.initiator?.user?.color ||
                  record.operation.initiator.color
                : record.peer?.user?.color || record.operation.peer.color,
            }}
          ></span>
          <img
            src={
              isPeer
                ? `/api/files/${
                    record.initiator?.user?.avatar ||
                    record.operation.initiator.avatar
                  }`
                : `/api/files/${
                    record.peer?.user?.avatar || record.operation.peer.avatar
                  }`
            }
            alt='second peer'
          />
        </td>

        {/* Operation Description */}
        <td
          style={{
            padding: record?.note || record?.operation?.note ? '0' : '2.5rem 0',
          }}
        >
          {record?.note || record?.operation?.note ? (
            <p className={style.row__desc}>
              <span onClick={() => setIsDescribeOn(true)}>
                <Reader />
              </span>
              <i style={{ lineBreak: 'anywhere', padding: '0 0.8rem' }}>
                {record.note
                  ? record.note?.substring(0, 35) + '...'
                  : record.operation.note.substring(0, 35) + '...'}
              </i>
            </p>
          ) : (
            <Badge bg='dark'>N/A</Badge>
          )}
        </td>

        {/* Creditor amount value*/}
        <td style={{ textTransform: 'capitalize' }}>{creditValue}</td>

        {/* Debtor amount value*/}
        <td> {debtValue} </td>

        <td>
          {isEmployee ? (
            <Badge bg='success'>{company.name}</Badge>
          ) : (
            <Badge bg='dark'>N/A</Badge>
          )}
        </td>

        {/* Operation Currency [usd, euro, aed]*/}
        <td
          style={{
            textAlign: lang === 'ar' ? 'center' : 'start',
            paddingLeft: '1rem',
          }}
        >
          <Currency currency={record.currency} />
        </td>

        {/* Operation State [pending, approved, declined]*/}

        {op && (
          <td
            className={style.row__state}
            style={{
              backgroundColor: getStateColor(record.state),
              textTransform: 'uppercase',
            }}
          >
            {record.state === 'pending' && isPeer && !id && (
              <>
                <span className={style.row__state_decision}>
                  <Check />
                  <Times />
                </span>
                <Decision id={record._id} />
              </>
            )}
            {t(record.state)}
          </td>
        )}
        {/* Delayed fine when due date over and debtor didn't pay */}
        {reports && due && (
          <td
            style={{
              color: fineAmount && !isCredit ? 'red' : 'green',
              padding:
                fineAmount && !isCredit && !finePaymentDate ? '0' : '2.5rem 0',
            }}
          >
            {finePaymentDate && !isCredit ? (
              <Badge bg='success'>{finePaymentDate}</Badge>
            ) : fineAmount && !isCredit ? (
              <p onClick={() => !id && setIsFine(true)} className={fineClasses}>
                <span title={id ? fineAmount : 'click to pay'}>
                  <CashRegister />
                </span>
                <i>{fineAmount}</i>
              </p>
            ) : (
              <Badge bg='dark'>N/A</Badge>
            )}
          </td>
        )}
        {/* Operation Due Date */}
        {(due || closed) && (
          <td
            style={{ backgroundColor: record.paymentDate ? '#FCD4DB' : '#fff' }}
          >
            {record.paymentDate ? (
              new Date(record.paymentDate).toLocaleDateString()
            ) : record.dueDate ? (
              <span
                className={isCredit && !id ? style.row__due : ''}
                onClick={() => isCredit && !id && setIsDueChange(true)}
              >
                {new Date(record.dueDate).toLocaleDateString()}
              </span>
            ) : (
              <Badge bg='dark'>N/A</Badge>
            )}
          </td>
        )}

        {reports && (
          <td>
            {record.paymentDate ? (
              <Badge bg='success'>{recordPaymentDate}</Badge>
            ) : (
              <span
                className={rowCloseClasses}
                onClick={() => isCredit && !id && setIsReportClose(true)}
              >
                <HandshakeSlash />
              </span>
            )}
          </td>
        )}
      </tr>
    </>
  )
}

export default Row
