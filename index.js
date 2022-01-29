// configure Idotenv module 
require("dotenv").config()

const app =require("./app");
 const mongoose =require("mongoose")
const config =require("./config/index")
 
 
 mongoose.connect(config.db.uri, {useNewUrlParser:true, useUnifiedTopology:true  }).then(()=> console.log("Database started "))
 
.catch(err=> console.log(err))
app.listen(process.env.PORT, ()=> console.log("Server is running on http://localhost:",process.env.PORT))