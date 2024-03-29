// @ts-nocheck
import React, { useState, useEffect } from 'react'
import style from './style.module.scss'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import {
  Pagination,
  Table,
  Filter,
  Loader,
  HeaderAlert,
  EmployeeHeaderData,
} from '@/src/components'
import { FilterSearch, Times } from '@/src/icons'
import actions from '@/src/actions'
import constants from '@/src/constants'

const Operation = () => {
  const [isFilter, setIsFilter] = useState(false)
  const [searchFilter, setSearchFilter] = useState({
    code: null,
    type: null,
    name: null,
    currency: null,
    dueDate: null,
    paymentDate: null,
    state: null,
  })
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { id } = useParams() // Employee Id
  const { loading, error, count, operations } = useSelector(
    (state) => state.listOperations
  )
  const { user } = useSelector((state) => state.isAuth)
  const filterOperationHandler = (skip) => {
    let query = { ...searchFilter }
    if (skip) query.skip = skip.skip
    dispatch(actions.operations.listAllOperations(id, query))
  }

  const resetFilterOperations = (_) => {
    dispatch(actions.operations.listAllOperations(id))
  }
  const type = new URLSearchParams(location.search).get('type')

  useEffect(() => {
    loading && setIsFilter(false)
  }, [loading])

  useEffect(() => {
    dispatch(actions.operations.listAllOperations(id))
    return () => dispatch({ type: constants.operations.LIST_OPERATIONS_RESET })
  }, [id])

  return (
    <>
      <Modal show={isFilter} onHide={() => setIsFilter(false)}>
        <span
          className={style.operation__close}
          onClick={() => setIsFilter(false)}
        >
          <Times />
        </span>
        <Filter
          op
          filterOperationHandler={filterOperationHandler}
          resetFilterOperations={resetFilterOperations}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
        />
      </Modal>
      <div className={style.operation}>
        <h1>{t('operations-records')}</h1>
        {type === 'employee' && <EmployeeHeaderData />}
        <div className={style.operation__wrapper}>
          <div className={style.operation__actions}>
            {user?.color !== '#ec4a0d' && !id && !user.isBlocked && (
              <button onClick={() => navigate('/operation/new')}>
                {t('new-operation')}
              </button>
            )}
            <button
              className={style.operation__filter}
              onClick={() => setIsFilter(true)}
            >
              <span>
                <FilterSearch />
              </span>
              <span> {t('filter')} </span>
            </button>
          </div>

          <Filter
            hidden
            op
            filterOperationHandler={filterOperationHandler}
            resetFilterOperations={resetFilterOperations}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
          />

          {loading && <Loader size='8' options={{ animation: 'border' }} />}
          {error && (
            <HeaderAlert
              position='relative'
              size='2'
              text={error}
              type='danger'
            />
          )}
          {operations && (
            <>
              <Table records={operations} due op />
              <Pagination
                count={Math.ceil(count / 5)}
                moveToPageHandler={(skip) => filterOperationHandler(skip)}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Operation
