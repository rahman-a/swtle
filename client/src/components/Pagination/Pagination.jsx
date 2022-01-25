import React, {useState, useEffect} from 'react'
import style from './style.module.scss'
import {v4 as uuidv4} from 'uuid'


let pageValue = 1

const Pagination = ({count, filterOperationHandler}) => {
    const [currentPage, setCurrentPage] = useState(1)
    const [pages, setPages] = useState([])
    const [isNextOff, setIsNextOff] = useState(false)
    const [isPrevOff, setIsPrevOff] = useState(true)
    
    const currentPageHandler = page => {
        setCurrentPage(page)
        pageValue = page
    }

    const paginateHandler = info => {
        if(typeof info === 'string') {
           info === 'next'
            ? pageValue = pageValue + 1
            : pageValue = pageValue - 1
            changeCurrentPage(info)
        }else {
            currentPageHandler(info)
        }
        const skip = (pageValue + 0) * 5 - 5
        filterOperationHandler({skip})
    }
    
    const toggleButton = _ => {
        if(currentPage > 1) {
            setIsPrevOff(false)
        }else {
            setIsPrevOff(true)
        }
        if(currentPage === count) {
            setIsNextOff(true)
        }else {
            setIsNextOff(false)
        }
    }
    useEffect(() => {
        if(count <= 5) {
            setPages([...Array(count)].map((_, idx) => idx + 1))
        }else {
            setPages([1,2,3,4,5])
        }
    },[])
    
    useEffect(() => {
        setCurrentPage(pageValue)
    },[])
    
    useEffect(() => {
        toggleButton()
    },[currentPage])
    
    const changeCurrentPage = type => {
        if(type === 'next') {
            if(currentPage >= 5) {
                const pagesArray = pages.slice(1, pages.length)
                pagesArray.push(pagesArray[pagesArray.length - 1] + 1)
                if(pagesArray[pagesArray.length - 1] <= count) {
                    setPages(pagesArray)
                }
            }
            if (currentPage < count) {
                setCurrentPage(prev => prev + 1)
            }
        }else if ('prev') {
            if(pages[0] === currentPage && currentPage > 1) {
                let pagesArray = pages.slice(0, pages.length - 1)
                pagesArray = [pages[0] - 1].concat(pagesArray)
                setPages(pagesArray)
            }
            if (currentPage > 1) {
                setCurrentPage(prev => prev - 1)
            }

        }
    }
    
    return (
        <div className={style.pagination}>
            <button 
            style={{backgroundColor:'unset'}}
            disabled={isPrevOff}
            className={isPrevOff ? style.pagination__off :''}
            onClick={() => paginateHandler('prev')}>
                Prev
            </button>
            {
                pages.map(page => {
                    return <button 
                    key={uuidv4()} 
                    className={`${style.pagination__page} 
                    ${page === pageValue && style.pagination__page_active}`}
                    onClick={() => paginateHandler(page)}>
                        {page}
                    </button>
                })
            }
            <button 
            style={{backgroundColor:'unset'}}
            disabled={isNextOff}
            className={isNextOff ? style.pagination__off :''}
            onClick={() => paginateHandler('next')}>
                Next
            </button>
        </div>
    )
}

export default Pagination
