var uranus = angular.module('uranus', []);
uranus.controller('ChatCtrl', ['$scope', function($scope) {
    var socket = io("http://localhost:3000");

    $scope.messages = [];
    $scope.users = [];

    $scope.me = null;
    $scope.currentUser = null;
    $scope.userMessages = [];

    $scope.switch = function(user) {
        //切换当前用户
        $scope.currentUser = user;
        //寻找userMessage
        $scope.messages = getUserMessage($scope.currentUser.id);
    };

    $scope.send = function() {
        socket.emit('chat-message', $scope.currentUser.id, {fromUser: $scope.me, content: $scope.sendMessage});
    };

    socket.on('init-success', function (user){
        $scope.me = user;
        $scope.$apply(function() {
            $scope.currentUser = user;
        });
    });

    socket.on('chat-message', function(msg) {
        console.log(msg);
        updateUserMessages(msg.fromUser.id, msg);
        $scope.$apply(function() {
            if (msg.fromUser.id == $scope.currentUser.id) {
                $scope.messages.push(msg);
            }
        });
    });

    socket.on('user-list', function(users) {
        $scope.$apply(function() {
            $scope.users = users;
        })
    });


    //根据uid来更新messages
    function updateUserMessages(id, msg) {
        var updated = false;
        $scope.userMessages.forEach(function (userMessage){
            if (userMessage.uid == id) {
                userMessage.message.push(msg);
                updated = true;
            }
        });
        if (!updated) {
            $scope.userMessages.push({
                uid: id,
                message: [msg]
            });
        }
    };

    function getUserMessage(id) {
        var messages = [];
        $scope.userMessages.forEach(function (userMessage){
            if (userMessage.uid == id) {
                messages = userMessage.message;
            }
        });
        //找不到就返回空
        return messages;
    };
}]);


