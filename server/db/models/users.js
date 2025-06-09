const mongoose = require("mongoose");

const users = new mongoose.Schema({
    firstName : {
        type : String,
        required : true,
        trim : true,
    },
    lastName : {
        type : String,
        required : true,
        trim : true,
    },
    googleId : {
        type : String,
    },
    email : {
        type : String,
        required : true,
        lowercase : true,
        trim : true,
    },
    emailVerified : {
        type : Boolean,
        default : false,
    },
    emailVerifiedAt : {
        type : Date,
        default : null,
    },
    user_type : {
        type : String,
        enum : ['customer','driver','admin'], //restrict to only valid roles
        default : "customer",
    },
    password : {
        type : String,
        required : true,
    },
},{
    timestamps : true,
});

module.exports = mongoose.model("users", users);