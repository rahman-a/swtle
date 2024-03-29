import React, { useState, useEffect } from 'react'
import style from './style.module.scss'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import Row from './Row'
import {
  Table,
  Pagination,
  HeaderAlert,
  Loader,
  ReportFilter,
  FilterModal,
  FilterButton,
  Panel,
} from '@/src/components'
import actions from '@/src/actions'

const Operations = () => {
  const [isFilterModal, setIsFilterModal] = useState(false)
  const [skipValue, setSkipValue] = useState(0)
  const [filter, setFilter] = useState({
    arabicName: '',
    englishName: '',
    code: '',
    value: '',
    currency: '',
    dueDate: '',
    isDue: true,
    isActive: true,
  })

  const defaultFilter = { isActive: true, isDue: true }

  const dispatch = useDispatch()

  const { loading, error, count, reports } = useSelector(
    (state) => state.listAllReports
  )

  const { t } = useTranslation()

  const initiateReportsFiltration = (skip) => {
    let query = { ...filter }

    if (skip?.skip || skip?.skip === 0) {
      setSkipValue(skip.skip)
      query = { ...filter, ...skip }
    }
    dispatch(actions.reports.listAllReports(query))
  }

  const resetFilterReports = (_) => {
    setSkipValue(0)
    dispatch(actions.reports.listAllReports(defaultFilter))
  }

  useEffect(() => {
    dispatch(actions.reports.listAllReports(defaultFilter))
  }, [])

  return (
    <>
      <div className={style.reports__due}>
        <FilterModal
          isFilter={isFilterModal}
          setIsFilter={setIsFilterModal}
          type='report'
          options={{
            searchFilter: filter,
            setSearchFilter: setFilter,
            resetFilterOperations: resetFilterReports,
            filterOperationHandler: initiateReportsFiltration,
          }}
        />

        <ReportFilter
          hidden
          searchFilter={filter}
          setSearchFilter={setFilter}
          resetFilterOperations={resetFilterReports}
          filterOperationHandler={initiateReportsFiltration}
        />

        <FilterButton onClick={() => setIsFilterModal(true)} />

        <Table>
          <thead>
            <th>#</th>
            <th>{t('report-code')}</th>
            <th>{t('first-party')}</th>
            <th>{t('second-party')}</th>
            <th>{t('operation-value')}</th>
            <th>{t('note')}</th>
            <th>{t('currency')}</th>
            <th>{t('due-date')}</th>
            <th>{t('createdAt')}</th>
          </thead>
          <tbody style={{ position: 'relative' }}>
            {loading ? (
              <Loader
                size='6'
                center
                options={{ animation: 'border' }}
                custom={{ transform: 'unset' }}
              />
            ) : error ? (
              <HeaderAlert type='danger' size='3' text={error} />
            ) : (
              reports &&
              reports.map((report, idx) => (
                <Row
                  due={true}
                  key={report._id}
                  idx={idx + skipValue}
                  report={report}
                />
              ))
            )}
          </tbody>
        </Table>
        <div className={style.reports__content}>
          {loading ? (
            <Loader
              size='6'
              center
              options={{ animation: 'border' }}
              custom={{ transform: 'unset' }}
            />
          ) : error ? (
            <HeaderAlert type='danger' size='3' text={error} />
          ) : (
            reports &&
            reports.map((report) => (
              <Panel report={true} key={report._id} record={report} />
            ))
          )}
        </div>
        {count > 0 && (
          <Pagination
            count={Math.ceil(count / 5)}
            moveToPageHandler={(skip) => initiateReportsFiltration(skip)}
          />
        )}
      </div>
    </>
  )
}

export default Operations
