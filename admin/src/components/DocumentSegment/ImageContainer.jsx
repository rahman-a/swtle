import React, {useState, useEffect} from 'react'
import style from './style.module.scss'
import {Modal, Button, Badge} from 'react-bootstrap'
import {Loader} from '../../components'

const ImageContainer = ({img, document, setImageContainer, imageContainer}) => {
  const [isLoading, setIsLoading] = useState(true)
  

  useEffect(() => {
    img && setIsLoading(false)
  },[img])
  
  return (
    <Modal show={imageContainer} onHide={() => setImageContainer(false)}>
        <Modal.Header>
           <Badge bg='dark'> {document} Document </Badge> 
        </Modal.Header>
        <Modal.Body>
          {
            isLoading 
            ? <Loader size='8' center options={{animation:'border'}}/>
            :<div className={style.segment__image}>
              <img src={img} alt={document} />
            </div>
          }
            
        </Modal.Body>
        <Modal.Footer>
            <Button onClick={() => setImageContainer(false)}
            variant='danger' size='lg'> Close  </Button>
        </Modal.Footer>
    </Modal>
  )
}

export default ImageContainer