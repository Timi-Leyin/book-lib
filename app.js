const express = require("express")
const bodyParser = require("body-parser");
const cookieParser=require("cookie-parser");
const config = require("./config/index")
const multer=require("multer")
 const cors=require("cors")
const sessions =require("express-session");
const connectMongoDbSession=require("connect-mongodb-session")(sessions);
const mongoose =require("mongoose")
const Books=require("./models/books")
const Users=require("./models/users")
const bcrypt =require("bcryptjs")
const app=express();
app.use(bodyParser.urlencoded({extended:true }))
app.use(bodyParser.json())
app.use(cookieParser())
const store = connectMongoDbSession({
  uri:config.db.uri,
  collection:"sessions", 
//  expires:MsToDays(1)
})
//Helpers 
function MsToDays( days) {
  return 1000 * 60 * 60 * 24 * parseInt(days);
}

let session ;

app.use(cors({
  origin:"https://booklib-ui.netlify.app"
}))

app.use("./uploads", express.static("./uploads"))

app.use(sessions({
  secret:"123",
  saveUninitialized:false , 
  resave:false, 
  //store, 
  cookie:{
    maxAge:MsToDays(1)
  }
}))

/*
* AUTH MIDDLEWARE
*/
const isAuth=(req, res, next)=>{
  if(session){
    next()
  }else{
    
  res.status(203).json({status:203,msg:"Not authorised"})
  }
}

const storage = multer.diskStorage({
  destination:(req, file, cb)=>{
    cb(null, "/uploads")
  }, 
  filename:(req, file, cb)=>{
    cb(null, file.originalname)
  }
})


const uploadImg = multer({storage}).single("image")


/* logout route 
* POST 
**/

app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{
    // clear session 
    session = req.session 
    res.status(202).json({msg:"Logged out!", data:[]})
  })
})


/* register route 
* POST 
* @params
* username ==== email ==== password
**/
app.post("/signup", (req, res)=>{
  const {username, email, password, } =req.body 
  
  if(username == null || username == undefined){
    res.json({status:400,msg:"username cannot be empty"})
  }else if(email == null || email == undefined){
    res.json({status:400,msg:"email cannot be empty"})
  }else if(password == null || password == undefined){
    res.json({status:400,msg:"password cannot be empty"})
  } else{
    Users.findOne({email}).then(exists=>{
      if(exists == null){
        bcrypt.hash(password, 10).then(hash=>{
          const user={...req.body, password:hash} 
          const users = new Users (user)
          users.save(user).then(stats=>{
            req.session.userId = stats._id
            session=req.session 
            res.json({status :200, msg:"Account created ", data:[{userId:stats._id}]})
          })
        })
      }else{
        res.json({msg:email+ " already exists", data:[]})
      }
    })// check if email exists 
    
  }
  
  
})



/* login route 
* POST 
* @params
* email ==== password
**/
app.post("/login", (req, res)=>{
  const {email, password} =req.body 
  console.log(req.body)
  if(email == null || email == undefined){
    res.status(400).json({status:400,msg:"email cannot be empty"})
  }else if(password == null || password == undefined){
    res.status(400).json({status:400,msg:"password cannot be empty"})
  } else{
    Users.findOne({email}).then(exists=>{
      if(exists){
        console.log(exists)
        bcrypt.compare(password, exists.password).then(same=>{
          if(same){
          req.session.userId = exists._id
          session = req.session 
            res.status(200).json({status:200,msg:"Your are now signed in as "+exists.username, data:[{userId:exists._id}]})
          }else{
        res.json({status:400, msg:"incorrect password!!! "})
          }
        })
      }else{
        res.json({status:400, msg:"Check your email address correctly "})
      }
    })// check if email exists 
    
  }
  
  
})


/* logged in user profile information  route 
* POST @PROTECTED
**/
app.get("/profile",isAuth,(req,res)=>{
  Users.findOne({_id:session.userId}).then(e=>{
  if(e){
res.json({status:200,data:[{...e._doc}]})
  }
  })
 .catch(err=> res.json({status:500,msg:"an error occurred "}))
})



/* add new book route 
* POST @PROTECTED
* @params
* name ==== author  ==== description === image
**/
app.post("/add-book", isAuth, (req, res)=>{
  const {name, author, description, content} =req.body
  console.log(req.body)
  /* image = req.file.path
  if(!name){
    res.json({msg:"Book title is required "})
  }
  else if(!description){
    res.json({msg:"Book Description is required "})
  } 
  else if(!author){
    res.json({msg:"Book Author is required "})
  } 
  else if(!content){
    res.json({msg:"Book Content is required "})
  } 
  if(!req.file){
    res.json({msg:"Book Image is required "})
  } 
  */
  // else{
    console.log(req.file)
    const books= new Books({
      name, 
      author, 
      description, 
       content, 
      userId:session.userId, 
      borrows:[]
    })
    books.save().then(addedBook=>{
      res.status(201).json({msg:"Book Added", data:[{...addedBook._doc}]})
    })
  //}
})


/* delete book route 
* @PROTECTED POST
* @params id
**/
app.post("/del-book/:id",isAuth, (req, res )=>{
const {ObjectId} =mongoose.Types,
_id = new ObjectId(req.params.id) 
  Books.findOne({_id})
 .then(bks=>{
   if(bks){
   //  console.log(session.userId, " <==> ", bks.userId)
  if(session.userId == bks.userId){
    Books.deleteOne({_id}).then(del=>{
      res.json({msg:"deleted "+bks.name})
    })
  } else{
       res.json({msg:"not allowed to delete "})
     }
     
   }else {
     res.json({msg:" can't find book to delete"})
   }
 })
})


/* delete user route 
* @PROTECTED POST
* @params id
**/
app.post("/del-user/:id",isAuth, (req, res )=>{
const {ObjectId} =mongoose.Types,
_id = new ObjectId(req.params.id) 
  Users.findOne({_id})
 .then(u=>{
   if(u){
     console.log(session.userId, " <==> ", u.userId)
  if(session.userId == u.userId){
    Users.deleteOne({_id}).then(del=>{
      res.json({msg:"deleted "+u.username})
    })
  } else{
       res.json({msg:"not allowed to delete "})
     }
     
   }else {
     res.json({msg:" can't delete"})
   }
 })
})

/* (2)
* update user route 
* @PROTECTED POST
* @params id
**/
app.post("/update-user/:id",isAuth, (req, res )=>{
  const {username, email, password } =req.body 
const {ObjectId} =mongoose.Types,
_id = new ObjectId(req.params.id) 
  Users.findOne({_id})
 .then(u=>{
   if(u){
   //  console.log(session.userId, " <==> ", u.userId)
  if(session.userId == u.userId){
    Users.findOneAndUpdate({_id}, {}).then(del=>{
      res.json({msg:"deleted "+u.username})
    })
  } else{
       res.json({msg:"not allowed to delete "})
     }
     
   }else {
     res.json({msg:" can't delete"})
   }
 })
})


/* get allbook route 
* GET
**/
app.get("/books", (req,res)=>{
  Books.find().then(bks=>{
    res.json({msg:"Found "+bks.length+" Books", data:[...bks]})
  })
})



/* get book by name route 
* GET
* @params name 
**/
app.get("/books/:name",(req,res)=>{
 Books.find({name:new RegExp(req.params.name, "ig") })
 .then(bks=>{
   if(bks.length>0){
   //  console.log() 
     res.json({msg:"Found "+req.params.name,data:[...bks]})
   }else{
     res.json({msg:"Can't find book"});
   }
 })
})



/* get books by id route 
* GET
* @params id
**/
app.get("/books/id/:id",(req,res)=>{
  const {ObjectId} =mongoose.Types
  Books.findOne({_id:new ObjectId(req.params.id) })
 .then(bks=>{
   if(bks){
    // console.log(bks)
     res.json({msg:"Found "+bks.name ,data:[{...bks._doc} ]})
   }else{
     res.json({msg:"Can't find book"});
   }
 })
})

function filterProps(array, key, value ){
const {ObjectId} =mongoose.Types

  let _found= -1
  const positions =[]
  for(let i=0; i<array.length; i++){
  console.log("level 1 ") 
    if(array[i].borrows.length > _found){
     console.log("greater")
     for(let j=0; j<array[i].borrows.length; j++){
      // console.log(array[i].borrows[j][key] == value)

       if(array[i].borrows[j][key].toString() ==  value.toString() ){
        console.log("found array===> ", i,"array.groups ===>", j)
    console.log(array)
       positions.push({
         ...array[i]._doc
        })
       }else{
        // console.log("not found")
       }
     }
    }
  }
  return positions
 }



app.get("/my-books",isAuth,  (req,res)=>{
  Books.find().then(bks=>{
  const filtered = bks.filter(bk=> bk.userId.toString() == session.userId.toString())
  res.json({msg:"My books ", data:[...filtered ]})
  })
})






/* borrow book by id route 
* @PROTECTED POST
* @params id
**/
app.post("/borrow-book/:id", isAuth, (req, res )=>{
  //helpers 
  const date=new Date().toLocaleString()
  console.log(date)
  // date to return book
  //format 
  //YYYY-MM-DDTHH:MM
// 2022-02-21T07:21
//datetime-local 
  const {return_date} = req.body ;
  //return_date ="2022-02-21T07:21"
  // mongoDb ObjectId type 
const {ObjectId} =mongoose.Types,
_id = new ObjectId(req.params.id) 
// find if book id exits 
Books.findOne({_id}).then(bks=>{
  if(bks){
   let alreadyBorrow=bks.borrows.findIndex(e=>e.userId = session.userId )
   console.log("alreadyBorrow", alreadyBorrow)
   // console.log("session userId ", session.userId," ===", bks.userId )
   if (return_date == "null" || return_date == "undefined" ) {
      res.json({msg:"invalid return date"})
    } else if (alreadyBorrow > -1) {
      res.json({msg :"You have already borrow this book"})
     } else if(bks.userId == session.userId){
      res.json({msg:"You can't borrow book you own"})
    }
    else {
      // console.log(bks, bks.borrows )
Books.findOneAndUpdate({_id},{
  borrows:[...bks.borrows, {
    userId:session.userId, 
    return_date, 
    borrow_date:date
  }]
})
.then(update =>{
  //console.log(update );
  res.json({msg:"book Borrowed "})
})
    }
  }else {
    res.json({msg:"cannot find book"})
  }
    
})


})

app.get("/return-book/:id", isAuth, (req, res )=>{
//
  //return_date ="2022-02-21T07:21"
  // mongoDb ObjectId type 
const {ObjectId} =mongoose.Types,
_id = new ObjectId(req.params.id) 
// find if book id exits 
Books.findOne({_id}).then(bks=>{
  if(bks){
   let alreadyBorrow=bks.borrows.findIndex(e=>e.userId.toString() === session.userId.toString() )
   console.log("alreadyBorrow", alreadyBorrow)
   // console.log("session userId ", session.userId," ===", bks.userId )
   if(alreadyBorrow == -1){
     res.json({msg:"You did not borrow this book"})
   }
    else {
      console.log(bks, bks.borrows )
      let index =bks.borrows.findIndex(up=> up.userId.toString() === session.userId.toString())
      console.log("new Uploading", index) 
      console.log(bks.borrows.splice(index, index-1)) 
Books.findOneAndUpdate({_id} ,{
 borrows:[]
})
.then(update =>{
  console.log(update );
  res.json({msg:"book Returned "})
})
    }
  }else {
    res.json({msg:"cannot find book"})
  }
    
})


})




app.get("/borrowed-book", isAuth, (req, res )=>{
 
const {ObjectId} =mongoose.Types,
_id = new ObjectId(session.userId) 

// find if book id exits 
Books.find().then(bks=>{
  if(bks){
    // console.log("655",bks)
   let filtered = filterProps([...bks], "userId",_id)
   console.log("==========      ", filtered,"      ======")
    res.json({msg:"Borrows", data:[...filtered]})
    }
    else {
      res.json({msg:"",data:[]})
} 
})

})




/* (1)
*get book borrower's information route 
* @PROTECTED POST
* @params id
**/
app.get("/books/borrow:name",isAuth,(req,res)=>{
  Books.findMany({name:req.param.name})
 .then(out=>{
   if(out){
     
   }else{
     res.json({msg:"Can't find book"});
   }
 })
})

/*======= TASK =======

[   ]  Uploading Book image(s) 
[   ]  Uploading Book Title 
[   ]  Original Book owner collect books whrn not returned at     
. . . .required tims
[   ]  Uploading Book Content 
[   ]  Verifi email 
[   ]  Forget password 
[   ]  Notification 
[   ]  Get all borrower's name
[ * ]  Delete User 
[   ]  Search User(s)
[   ]  Update User Details 
[ * ]  Get all Books
[ * ]  Delete Book
[   ]  User Update 

======= TASK =======*/


// export base app
module.exports = app
