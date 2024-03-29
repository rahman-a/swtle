import React from 'react'
import style from './style.module.scss'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { DateInput } from '@/src/components'

const Documents = ({
  getInfoValues,
  setIdentity,
  identity,
  setPassport,
  passport,
}) => {
  const { t } = useTranslation()

  return (
    <div className={style.provider__segment}>
      <h2>{t('provider-documents')}</h2>
      <div style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc' }}>
        <Form.Group controlId='formFilePersonal' className='mb-3'>
          <Form.Label>{t('upload-provider-photo')}</Form.Label>
          <Form.Control
            type='file'
            size='lg'
            name='avatar'
            onChange={(e) => getInfoValues(e)}
          />
        </Form.Group>
      </div>

      <div style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc' }}>
        <Form.Group controlId='formFileIdentityFront' className='mb-3'>
          <Form.Label>{t('upload-provider-identity-front')}</Form.Label>
          <Form.Control
            type='file'
            size='lg'
            onChange={(e) =>
              setIdentity({ ...identity, image: e.target.files[0] })
            }
          />
        </Form.Group>

        <Form.Group controlId='formFileIdentityBack' className='mb-3'>
          <Form.Label>{t('upload-provider-identity-back')}</Form.Label>
          <Form.Control
            type='file'
            size='lg'
            onChange={(e) =>
              setIdentity({ ...identity, back: e.target.files[0] })
            }
          />
        </Form.Group>

        <DateInput
          name='identity'
          custom={{ marginLeft: '0', transform: 'unset' }}
          getExpiryDate={(date) => setIdentity({ ...identity, expireAt: date })}
        />
      </div>

      <div style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc' }}>
        <Form.Group controlId='formFilePassport' className='mb-3'>
          <Form.Label>{t('upload-provider-passport')}</Form.Label>
          <Form.Control
            type='file'
            size='lg'
            onChange={(e) =>
              setPassport({ ...passport, image: e.target.files[0] })
            }
          />
        </Form.Group>
        <DateInput
          name='passport'
          custom={{ marginLeft: '0', transform: 'unset' }}
          getExpiryDate={(date) => setPassport({ ...passport, expireAt: date })}
        />
      </div>
    </div>
  )
}

export default Documents
