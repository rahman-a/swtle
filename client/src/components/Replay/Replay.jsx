import React, {useState,useEffect, useRef} from 'react'
import style from './style.module.scss'
import { useSelector, useDispatch } from 'react-redux'
import {Form, Button} from 'react-bootstrap'
import RichTextEditor from 'react-rte';
import {PaperPlane} from '../../icons'
import {Loader, SideAlert} from '../../components'
import actions from '../../actions';
import constants from '../../constants';

const Replay = ({setIsEditor, id, type}) => {
    const [title, setTitle]  = useState('')
    const [response, setResponse] = useState(RichTextEditor.createEmptyValue())
    const [file, setFile] = useState(null)
    const [errors, setErrors] = useState(null)
    const attachRef = useRef()
    const dispatch = useDispatch()
    const {loading, error, message} = useSelector(state => state.addTicketReplay)
    const {
        loading:create_loading, 
        error:create_error, 
        message:create_message
    } = useSelector(state => state.createTicket)
  
    const toolbarConfig = {
        display: ['INLINE_STYLE_BUTTONS', 'BLOCK_TYPE_BUTTONS','BLOCK_TYPE_DROPDOWN', 'HISTORY_BUTTONS'],
        INLINE_STYLE_BUTTONS: [
          {label: 'Bold', style: 'BOLD', className: 'custom-css-class'},
          {label: 'Italic', style: 'ITALIC'},
          {label: 'Underline', style: 'UNDERLINE'}
        ],
        BLOCK_TYPE_DROPDOWN: [
          {label: 'Normal', style: 'unstyled'},
          {label: 'Heading Large', style: 'header-one'},
          {label: 'Heading Medium', style: 'header-two'},
          {label: 'Heading Small', style: 'header-three'}
        ],
        BLOCK_TYPE_BUTTONS: [
          {label: 'UL', style: 'unordered-list-item'},
          {label: 'OL', style: 'ordered-list-item'}
        ]
    };

    const discardEditorHandler = _ => {
        setIsEditor(false)
        setResponse(RichTextEditor.createEmptyValue())
        attachRef.current.value = null
        setTitle('')
      }
  
      const sendResponseHandler = _ => {
          if(!title) {
            setErrors('title is required...')
            return 
          }
          if(response.toString('html').length < 50) {
            setErrors('minimum length required of replay is 50 characters')
            return
          }
          const data = new FormData()
          data.append('title', title)
          data.append('body', response.toString('html'))
          if(file) {
            data.append('file', file)
          }

          if(type === 'response') {
              data.append('sender', 'member')
          }
          
          type === 'response'
          ? dispatch(actions.tickets.addResponseToTickets(id, data))
          : type === 'create'
          && dispatch(actions.tickets.createNewTicket(data))
          
      }
  
    const clearAlert = _ => {
      type === 'response' 
      ? dispatch({type:constants.tickets.ADD_TICKET_REPLAY_RESET})
      : type === 'create'
      && dispatch({type: constants.tickets.CREATE_TICKET_RESET})

      setErrors(null)
    }
    
    useEffect(() => {
        return () => clearAlert()
    },[])
    
    useEffect(() => {
    error && setErrors(error)
    },[error])
    
    useEffect(() => {
        create_error && setErrors(create_error)
    },[create_error])
    
    return (

    <>
            
            
        <SideAlert
            text={errors}
            isOn={errors ? true : false}
            type='danger'
            reset={() => clearAlert()}
            />

        <SideAlert
            text={message}
            isOn={message ? true : false}
            type='success'
            reset={() => clearAlert()}
            />

        <SideAlert
            text={create_message}
            isOn={create_message ? true : false}
            type='success'
            reset={() => clearAlert()}
            />
        
        <div className={style.edit}>
                        
            <Form.Group controlId="formFile" className='m-2'>
                <Form.Control 
                type="text" 
                className='mb-3'
                size='lg'
                style={{margin:'1rem 0'}}
                placeholder='Enter the Title here...'
                value={title}
                onChange={(e) => setTitle(e.target.value)}/>
            </Form.Group>
            
            <div className={style.edit__area}>
                <RichTextEditor
                placeholder='Enter the Replay here....'
                toolbarConfig={toolbarConfig}
                value={response}
                onChange={(value) => setResponse(value)} 
                />
            </div>

            <div className={style.edit__footer}>     
                <Button variant='dark' onClick={discardEditorHandler}> Discard </Button>
                
                <Form.Group controlId="formFile">
                    <Form.Control 
                    type="file"  
                    ref={attachRef}
                    onChange={(e) => setFile(e.target.files[0])}/>
                </Form.Group>
                
                <Button 
                variant='success'
                onClick={sendResponseHandler}>
                    <span> <PaperPlane/> </span>
                    Send
                </Button>
                {(loading || create_loading) && <Loader size='4' options={{animation:'border'}}/> }
            </div>
        </div>
    </>
  )
}

export default Replay