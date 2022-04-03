import React from 'react'
import style from './style.module.scss'
import {useTranslation} from 'react-i18next'
import {Row} from '../../components'

const Table = ({records, due, op, closed, reports}) => {
    const {t} = useTranslation()
    return (
        <div className={style.records}>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>{t('operation-code')}</th>
                        <th>{t('peer-name')}</th>
                        <th>{t('peer-photo')}</th>
                        <th>{t('note')}</th>
                        <th>{t('credit')}</th>
                        <th>{t('debt')}</th> 
                        <th>{t('operation-currency')}</th>
                        {op && <th>{t('operation-status')}</th> }
                        {(due || closed) && <th> {closed ? t('payment-date') : t('due-date')} </th>}
                        {reports && <th>{t('close-report')}</th>}
                    </tr>
                </thead>
                <tbody>
                    {
                        records.map((record, idx) => (
                            <Row 
                            record={record} 
                            idx={idx} 
                            key={record._id} 
                            reports={reports}
                            due={due}
                            closed={closed}
                            op={op}/>
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

export default Table
