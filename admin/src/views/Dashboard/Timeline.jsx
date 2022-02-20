import React, {useState, useEffect} from 'react'
import style from './style.module.scss'

const Timeline = ({name, date, type}) => {
  const [color, setColor] = useState('#25221B')
  const dateOptions = {
    weekDay:'long',
    month:'short',
    year:'numeric',
    day:'numeric'
  }

  const colors = [
    '#102C54',
    '#25221B',
    '#CB3234',
    '#8B8C7A',
    '#A5A5A5',
    '#C1876B',
    '#ED760E',
    '#008F39',
    '#E5BE01',
    '#7FB5B5',
    '#45322E',
    '#3F888F'
  ]

  useEffect(() => {
    setColor(colors[Math.floor(Math.random() * colors.length)])
  },[])
  
  return (
    <div className={style.dashboard__timeline_item}
    style={{color}}>
        <div className={style.dashboard__timeline_dot}
        style={{backgroundColor:color}}></div>
        <div className={style.dashboard__timeline_content}>
            <h3 className={style.dashboard__timeline_name}>
              <span style={{color:'#333', fontStyle:'italic', fontSize:'1.3rem'}}>
                {type === 'ticket' ? 'New Ticket:' : 'New Member:'}
                </span>  
                <span>  {name} </span>
            </h3>
            <p className={style.dashboard__timeline_date}>
              Registered at: {new Date(date).toLocaleDateString('en-US', dateOptions)}
            </p>
        </div>
    </div>
  )
}

export default Timeline