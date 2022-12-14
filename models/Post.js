const mongoose = require("mongoose");
const Schema = mongoose.Schema

const schema = new Schema({
    id:{
        type: String
    },
    title: {
        type: String,
        required: true
    },
    text:{type: Array,
        required: true
    },
    texten:{type: Array,
        required: true
    },
    imgUri:{type:String,required: true},
    imgAlt:{type:String},
    keywords:{type: Array},
    en_keywords:{type:Array},
    time:{type:String},
    date:{type:String},
    d:{type:Number},
    m:{type:Number},
    y:{type:Number},
    meta: {
        title: {type: String},
        description:{type: String},
        createdAt: {
            type: Date,
            default: Date.now()
        },
        updatedAt: {
            type: Date,
            default: Date.now()
        }
    }
})
module.exports = mongoose.model('Posts',schema)