// @ts-nocheck
import React from 'react'
import { Badge, Tooltip } from 'react-bootstrap'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import { useTranslation } from 'react-i18next'
const StatusLabel = ({ color }) => {
  const { t } = useTranslation()
  const status = {
    '#fffb00': t('warning'),
    '#037A12': t('qualified'),
    '#ec4a0d': t('danger'),
  }
  const variant = {
    '#fffb00': 'warning',
    '#037A12': 'success',
    '#ec4a0d': 'danger',
  }
  return (
    <OverlayTrigger
      placement='top'
      overlay={
        <Tooltip style={{ fontSize: '1.2rem' }}>
          {t('member-status', { status: status[color] })}
        </Tooltip>
      }
    >
      {({ ref, ...triggerHandler }) => (
        <Badge
          ref={ref}
          style={{
            position: 'relative',
            zIndex: '9999999',
            margin: '0 5px',
            display: 'flex',
            justifyContent: 'center',
          }}
          {...triggerHandler}
          bg={variant[color]}
        >
          S
        </Badge>
      )}
    </OverlayTrigger>
  )
}

export default StatusLabel
