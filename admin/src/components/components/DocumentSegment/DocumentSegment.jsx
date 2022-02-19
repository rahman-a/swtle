import React, { useState, useEffect} from 'react'
import style from './style.module.scss'
import {useSelector} from 'react-redux'
import { Plus} from '../../icons'
import {UpdateDocument, Loader} from '../../components'

const DocumentSegment = ({ img, document, isExpired }) => {
  const [isEdit, setIsEdit] = useState(false)
  const [loadingState, setLoadingState] = useState(false)
  const {isDone} = useSelector(state => state.updateDocuments)

  useEffect(() => {
    isDone && setLoadingState(false)
  },[isDone])
  
  return (
    <>
      <UpdateDocument
      isEdit={isEdit}
      setIsEdit={setIsEdit}
      setLoadingState={setLoadingState}
      document={document}/>

      <div className={style.segment}>
        {img && !isExpired ? (
          <div className={style.segment__doc}>
            <img src={img} alt={document} />
            <p>{document} document</p>
          </div>
        ) : (
          <div 
            className={style.segment__block} 
            onClick={() => !loadingState && setIsEdit(true)}>
            <div className={style.segment__block_action}>
            
            {
              loadingState
              ? <Loader size='5' center options={{animation:'border'}}/>
              :<>
                <span>
                {' '}
                <Plus />{' '}
                </span>
                <span>{`upload your ${document}`}</span>
              </>
            }
               
            </div>
            <p>{document} document</p>
          </div>
        )}
      </div>
    </>
  )
}

export default DocumentSegment