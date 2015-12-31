var express = require('express');
var app = express();
var http = require('http').Server(app);
var dl  = require('delivery');
var Server = require('socket.io');
var fs  = require('fs');

var io = new Server(http);
var users = [];


app.get('/', function(req, res) {
    res.send('<h1>Hello world</h1>');
});

app.get('/upload/:name', function(req, res){
    var file = __dirname + '/upload/' + req.params.name;
    res.download(file); // Set disposition and send it.
});

io.on('connection', function(socket) {
    //用户序号
    var index = -1;
    //处理新用户
    var user = {name: 'vistor-' + socket.id, id: socket.id, avatar: null};
    var verify = false;
    var delivery = dl.listen(socket);

    delivery.on('receive.success',function(file){
        fs.writeFile('upload/' + file.name, file.buffer, function(err){
            if (err) {
                console.log('File could not be saved.');
            } else {
                var msg = file.params.msg;
                msg.fileUrl = 'upload/' + file.name;

                //如果不为讨论组的消息，且不是自己发给自己，则还要发自己一份
                if (msg.dialog.did.indexOf('dialog') != 0 && msg.fromUser.id != msg.dialog.did) {
                    io.to(msg.fromUser.id).emit('chat-message', msg);
                }
                io.to(msg.dialog.did).emit('chat-message', msg);
                console.log('File saved.');
            };
        });
    });

    socket.on('get-user-list', function (){
        io.to(user.id).emit('user-list', users);
    });

    socket.on('get-user-info', function (){
        io.to(user.id).emit('user-info', user);
    });

    //当注册以后才承认用户
    socket.on('register', function (userInfo){
        user.name = userInfo.name
        user.avatar = userInfo.avatar;
        if (!verify) {
            index = users.length;
            users.push(user);
            verify = true;
        } else {
            users[index] = user;
        }
        updateUserList();
        io.emit('user-list', users);
    });

    //加入讨论组
    socket.on('join-dialog', function (did){
        console.log('receive join dialog', did);
        socket.join(did);
    });

    //创建讨论组
    socket.on('create-dialog', function (users){
        console.log('receive create dialog', users);
        var did = 'dialog';
        var name = '';

        //拼接dialogID
        users.forEach(function (user){
            did += '-' + user.id;
        });

        var extraStr = '   共 ' + users.length + ' 人';
        for (var i = 0; i < users.length; i++) {
            if (name.length < 30) {
                name += users[i].name + ', ';
            } else {
                extraStr = '   等 ' + users.length + ' 人';
                break;
            }
        }
        name = name.substr(0, name.length - 2);
        name += extraStr;

        var dialog = {
            did: did,
            name: name,
            users: users
        };
        //将dialog传入所有的user
        users.forEach(function (user){
            io.to(user.id).emit('join-dialog', dialog);
        });
    });

    socket.on('chat-message', function(msg) {
        io.to(msg.dialog.did).emit('chat-message', msg);
    });

    socket.on('disconnect', function (){
        updateUserList();
        io.emit('user-list', users);
    });

    function updateUserList() {
        var newUsers = [];
        var connected = io.sockets.connected;
        users.forEach(function (user){
            if (user.id in connected) {
                newUsers.push(user);
            }
        });
        users = newUsers;
    };
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

