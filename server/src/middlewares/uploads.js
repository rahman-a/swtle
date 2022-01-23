import multer from 'multer'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url)) 
const uploadDirectory = path.resolve(__dirname, '../../uploads')

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDirectory)
    },
    filename(req, file, cb){
        const fileName = `${file.fieldname}-${Date.now()}-${path.extname(file.originalname)}`
        req.fileName = fileName 
        cb(null, fileName)
    }
})

export const uploadHandler = multer({
    storage,
    limits:{
        fileSize:5000000
    },
    fileFilter(req, file, cb){
        if(!file.originalname.match(/\.(png|jpg|jpeg|PNG|JPG|JPEG)$/)) {
            cb(new Error('please upload image with following formats [png, jpg, jpeg]'))
        }
        cb(undefined, true)
    }
})
