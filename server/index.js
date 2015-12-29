var app = require('express')();
var http = require('http').Server(app);

var Server = require('socket.io');
var io = new Server(http);
var users = [];

app.get('/', function(req, res) {
    res.send('<h1>Hello world</h1>');
});

io.on('connection', function(socket) {
    //用户序号
    var index = -1;
    //处理新用户
    var user = {name: "vistor-" + socket.id, id: socket.id, avatar: null};
    var verify = false;

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
        console.log("receive join dialog", did);
        socket.join(did);
    });

    //创建讨论组
    socket.on('create-dialog', function (users){
        console.log("receive create dialog", users);
        var did = "dialog";

        //拼接dialogID
        users.forEach(function (user){
            did += "-" + user.id;
        });
        //将dialogID传入所有的user
        users.forEach(function (user){
            io.to(user.id).emit('join-dialog', did);
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

