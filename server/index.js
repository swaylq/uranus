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
    var user = {name: "vistor-" + socket.id, id: socket.id};
    var verify = false;

    socket.on('get-user-list', function (){
        io.to(user.id).emit('user-list', users);
    });

    socket.on('get-user-info', function (){
        io.to(user.id).emit('user-info', user);
    });

    //当输入了名字才承认了用户
    socket.on('change-name', function (name){
        user.name = name;
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

    socket.on('chat-message', function(id, msg) {
        io.to(id).emit('chat-message', msg);
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

