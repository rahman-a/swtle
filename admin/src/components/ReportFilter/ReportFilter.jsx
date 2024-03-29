import React from 'react'
import i18next, { t } from 'i18next'
import classnames from 'classnames'
import style from './style.module.scss'
import { Input, DropdownMenu, DateInput } from '@/src/components'

const Filter = ({
  hidden,
  filterOperationHandler,
  resetFilterOperations,
  searchFilter,
  setSearchFilter,
  nonDue,
  closed,
}) => {
  const searchFilterHandler = (e) => {
    const value = { [e.target.name]: e.target.value }
    setSearchFilter({ ...searchFilter, ...value })
  }

  const selectSearchFilterHandler = (filter) => {
    setSearchFilter({ ...searchFilter, ...filter })
  }

  const resetFilterHandler = (_) => {
    const resetFilterObject = {
      arabicName: '',
      englishName: '',
      code: '',
      value: '',
      currency: '',
      state: '',
      dueDate: '',
    }
    setSearchFilter(resetFilterObject)
    resetFilterOperations()
  }

  const startFilterProcessOnEnter = (e) => {
    if (e.keyCode === 13 || e.which === 13) {
      filterOperationHandler()
    }
  }

  const lang = i18next.language

  const filterDateHandler = (date) => {
    if (closed) {
      setSearchFilter({ ...searchFilter, paymentDate: date })
    } else {
      setSearchFilter({ ...searchFilter, dueDate: date })
    }
  }

  const filterClasses = classnames(style.filter, {
    [style.filter__hidden]: hidden,
  })

  return (
    <div className={filterClasses} onKeyDown={startFilterProcessOnEnter}>
      <div className={style.filter__input}>
        <Input
          name='code'
          type='text'
          placeholder='code'
          value={searchFilter['code']}
          className={style.filter__input_value}
          onChange={(e) => searchFilterHandler(e)}
        />
      </div>

      {lang === 'ar' ? (
        <div className={style.filter__input}>
          <Input
            name='arabicName'
            type='text'
            placeholder='name'
            value={searchFilter['arabicName']}
            className={style.filter__input_value}
            onChange={(e) => searchFilterHandler(e)}
          />
        </div>
      ) : (
        <div className={style.filter__input}>
          <Input
            name='englishName'
            type='text'
            placeholder='name'
            value={searchFilter['englishName']}
            className={style.filter__input_value}
            onChange={(e) => searchFilterHandler(e)}
          />
        </div>
      )}

      <div className={style.filter__input}>
        <Input
          name='value'
          type='text'
          placeholder='value-range'
          value={searchFilter['value']}
          className={style.filter__input_value}
          onChange={(e) => searchFilterHandler(e)}
        />
      </div>

      {!nonDue && (
        <div className={style.filter__input}>
          <DateInput
            custom={{
              marginLeft: '0',
              transform: 'unset',
              boxShadow: '1px 2px 3px rgb(0 0 0 / 30%)',
            }}
            name='Due Date'
            getExpiryDate={(date) => filterDateHandler(date)}
          />
        </div>
      )}

      <div className={style.filter__input}>
        <DropdownMenu
          className={style.filter__input_dropdown}
          onSelectHandler={(value) =>
            selectSearchFilterHandler({ currency: value })
          }
          data={{
            label: 'currency',
            items: [
              { text: 'USD', value: 'USD' },
              { text: 'EURO', value: 'EURO' },
              { text: 'AED', value: 'AED' },
            ],
          }}
        />
      </div>

      <div className={style.filter__input}>
        <button className={style.filter__btn} onClick={filterOperationHandler}>
          {t('search')}
        </button>
        <button className={style.filter__btn} onClick={resetFilterHandler}>
          {t('reset')}
        </button>
      </div>
    </div>
  )
}

export default Filter
