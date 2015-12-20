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
    var index = users.length;
    //处理新用户
    var user = {name: "vistor-" + socket.id, id: socket.id};
    users.push(user);
    io.to(user.id).emit('init-success', user);

    socket.on('chat-message', function(id, msg) {
        io.to(id).emit('chat-message', msg);
    });

    socket.on('disconnect', function (){
        users.splice(index, 1);
        io.emit('user-list', users);
    });
    
    io.emit('user-list', users);
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

