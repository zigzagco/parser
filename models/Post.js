const mongoose = require("mongoose");
const Schema = mongoose.Schema

const schema = new Schema({
    title: {
        type: String,
        required: true
    },
    text:{type: String,
        required: true
    },
    imgUri:{type:String},
    imgAlt:{type:String},
    meta: {
        title: {type: String},
        description:{type: String},
        keywords:{type: String},
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
module.exports = mongoose.model('Post',schema)