import React from 'react'

const CheckDouble = (props) => {
    return (
        <svg  
        {...props} 
        width="1em" 
        height="1em" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg">
            <g data-name="Layer 2">
                <g data-name="checkmark-circle-2">
                    <rect width="24" height="24" opacity="0"/>
                    <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm4.3 7.61l-4.57 6a1 1 0 0 1-.79.39 1 1 0 0 1-.79-.38l-2.44-3.11a1 1 0 0 1 1.58-1.23l1.63 2.08 3.78-5a1 1 0 1 1 1.6 1.22z"/>
        </g></g></svg>
    )
}

export default CheckDouble
