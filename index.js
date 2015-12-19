var app = require('express')();
var http = require('http').Server(app);

var Server = require('socket.io');
var io = new Server(http);

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});