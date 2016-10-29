module.exports = function(app, apiRoutes){
    var mongoose = require('mongoose');
    var userHelper = require('../models/userHelper');
    var path = require("path");
    var User = require('../models/user');
    var _batmanMailer = require(path.join(process.env.PWD , "helpers", "BatmanMailer", "index.js"));
    var _compiler = require(path.join(process.env.PWD , "helpers", "mailer.js"));
    var crypto = require("crypto");

    function create(req, res){
       var data = req.body;
       var _plainPwd = req.body.password;

        userHelper.create(data, function(err, user){
          if(err){
              return res.status(409).json(err);
          }

          res.status(200).json(user);
        });
    }

    function update(req, res){
         var data = {};
         var REQ = req.body || req.params;

         !REQ.username || (data.username = REQ.username);
         !REQ.password || (data.password = REQ.password);
         !REQ.email || (data.email = REQ.email);
         !REQ.first_name || (data.first_name = REQ.first_name);
         !REQ.last_name || (data.last_name = REQ.last_name);
         !REQ.role || (data.role = REQ.role);
         !REQ.metadata || (data.metadata = REQ.metadata);

         User.findOne({_id : mongoose.Types.ObjectId(req.params.id)}, function(err, user){
             if(REQ.password){
                data.password = require(process.env.PWD + "/helpers/crypto-util")(REQ.password);
             }

             data = { $set : data }; 

             userHelper.update({ _id : mongoose.Types.ObjectId(req.params.id) }, data, function(err, rs){
                if(rs){
                  res.json(rs);
                }
             });                  
         });          
    }

    function remove(req, res){
        userHelper.remove(req.params.id, function(err, user){
            if(!err){
                user.remove();
                res.status(200)
                res.end();
            }
        })
    }

    function users(req, res){
        User.find()
        .exec(function(err, users){
            if(!err){
                res.status(200).json(users.map(function(obj){
                  obj.password = null;

                  return obj;
                }));
            }
        });
    }

    function user(req, res){
        var Role = require("../models/roles");

        User
        .findOne( mongoose.Types.ObjectId(req.params.id))
        .exec(function(err, user){
            if(user){
                user.password = null;
                res.status(200).json(user);
              }else{
                res.status(500).json(err);
              }
        })

    }

    function login(req, res){
            if (!req.body.username) {
                res.status(400).send({err : 'debe especificar un usuario'});
                return;
            }

            if (!req.body.password) {
                res.status(400).send({err : 'debe especificar un password'});
                return;
            }

          var jwt = require('jsonwebtoken');
          var UserSchema = require('../models/user');

         UserSchema.findOne({username : req.body.username}).exec(function(err, user){
            if(!user){
                    res.status(401).json({err : 'Usuario o clave incorrectos'});
                    return;
             }

            if(user.auth(req.body.password)){
                  user.password = null;

                  var token = jwt.sign(user, app.get('secret'), {
                      expiresIn: 43200 // 24 horas (suficientes para una jornada laboral)
                    });

                  userHelper.createSession({token : token, user : user }, function(err, userToken){
                        res.status(200).json({token:token, user : user});
                  });  
            }else{
                  res.status(401).json({err: 'Usuario o clave incorrectos'});
            }
        });
    }

    function passwordReset(req, res){
         var data = {};
         var REQ = req.body || req.params;

        if(REQ.newpwd == REQ.confirmpwd){
            User.findOne({ _id : mongoose.Types.ObjectId(REQ.id) }, function(err, rs){
                if(rs){
                        rs.password = require(process.env.PWD + "/helpers/crypto-util")(REQ.newpwd);
                        rs.save(function(err, rs){
                            if(rs){
                                res.status(200).json({message : "ok"});
                            }
                        })
                }else{
                    res.status(404).json({message : "user not found"})
                }
            });            
        }else{
            res.status(400).json({message : "password not match"})
        }
    }
/*
    function recover(req, res){
        var REQ = req.body || req.params;
        User.findOne({ email : REQ.email}, function(err, rs){
            if(rs){
                  crypto.pseudoRandomBytes(30, function (err, raw) {
                      rs.resetPasswordToken = raw.toString('hex');
                      rs.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                      rs.save(function(err, rs){
                          if(rs){
                              res.status(200).json({message : "ok"});

                              var _html;
                              var mailOptions = {
                                    from: "listerine1989@gmail.com",
                                    to: rs.email,
                                    subject: 'Recuperacion de Contraseña'
                              }

                              _html = _compiler.render({ _data : {
                                url : rs.resetPasswordToken
                                } }, 'recover/index.ejs');

                               mailOptions.html = _html;

                              var _shell  = _batmanMailer.bulk([mailOptions]);

                              _shell.stdout.on('data', function(output) {
                                  console.log('stdout: ' + output);
                              });

                              _shell.stderr.on('data', function(output) {
                                  console.log('stdout: ' + output);
                              });

                              _shell.on('close', function(code) {
                                  console.log('closing code: ' + code);
                              }); 
                          }
                          })
                      }) 
                  }else{
                      res.status(404).json({message : "user not found"})
                  }                    
                  
                  }); 
    }*/

  /*function reset(req, res){
      var REQ = req.body || req.params;
      
      User.findOne({ resetPasswordToken: REQ.link, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
            res.status(404).json({message: 'no user found or reset link has been expired'});
        }else{
          user.password = require(process.env.PWD + "/helpers/crypto-util")(REQ.newpwd);
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          user.save(function(err, rs){
              if(rs){
                  res.status(200).json({message : "ok"});
              }
          })
        }
      });      
  }*/

    apiRoutes.get('/user', users);
    apiRoutes.get('/user/:id', user);
    //apiRoutes.get('/user/verification-code/:user', verificationCode);
    //app.get('/api/user/exists/:email', exists);
    //app.post('/api/reset/:token', reset);
    //app.post('/api/password-reset/', passwordReset);
    //app.post('/api/recover/', recover);
    app.post("/api/user", create);
    app.post("/api/login", login);
    apiRoutes.put("/user/:id", update);
    apiRoutes.delete("/user/:id", remove);

    return this;
}