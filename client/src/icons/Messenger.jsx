import React from 'react'

const Messenger = (props) => {
  return (
    <svg
      {...props}
      fill='currentColor'
      width='1em'
      height='1em'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M12,1.923C6.477,1.923,2,6.1,2,11.254a9.09,9.09,0,0,0,3.683,7.233v3.59L9.04,20.169a10.7,10.7,0,0,0,2.96.415c5.523,0,10-4.178,10-9.33S17.523,1.923,12,1.923Zm1.012,12.485-2.565-2.693L5.539,14.408,10.932,8.7l2.589,2.646L18.374,8.7Z' />
    </svg>
  )
}

export default Messenger
