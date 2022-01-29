const mongoose = require("mongoose"), 
Schema=mongoose.Schema;

let bookSchema=new Schema({
  name:{
    type :String, 
    require:true 
  }, 
  content:{
    type:String, 
    required :true 
  }, 
  author:{
    type:String 
  }, 
  userId:{
    type:String, 
    require:true 
  }, 
  description:{
    type:String 
  }, 
  borrows:{
    type:[Object] 
  }
}, 
{collection:"books", timestamps:true })

module.exports = mongoose.model("books", bookSchema)