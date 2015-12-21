var socket = null;
var uranus = angular.module('uranus', ['ui.router'])
    .config(function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('login', {
                url: '/login',
                templateUrl: 'templates/login.html',
                controller: 'LoginCtrl'
            })
            .state('chat', {
                url: '/chat',
                templateUrl: 'templates/chat.html',
                controller: 'ChatCtrl'
            });
        $urlRouterProvider.otherwise('/login');
    });


uranus.controller('ChatCtrl', ['$scope', '$state', function($scope, $state) {

    if (socket == null) {
        $state.go('login');
        return;
    }

    $scope.totalUnread = 0;
    $scope.tab = 'users';
    $scope.users = [];
    $scope.me = null;
    $scope.currentDialog = {
        uid: null,
        name: null,
        msgs: [],
        unread: 0
    };
    $scope.dialogs = [];

    //切换当前用户
    $scope.switchUser = function(user) {
        //根据userid找dialog
        $scope.currentDialog = getDialog({
            uid: user.id,
            name: user.name,
            msgs: [],
            unread: 0
        });
        $scope.tab = 'dialogs';
    };

    //切换当前会话
    $scope.switchDialog = function(dialog) {
        $scope.currentDialog = getDialog(dialog);
    };

    $scope.send = function() {
        var msg = {
            fromUser: $scope.me,
            content: $scope.sendMessage
        };
        //如果不是自己和自己聊天，要把msg加入
        if ($scope.currentDialog.uid != $scope.me.id) {
            updateDialogs($scope.currentDialog, msg, false);
        }
        socket.emit('chat-message', $scope.currentDialog.uid, msg);
    };

    //获取用户信息
    socket.emit('get-user-info');
    socket.emit('get-user-list');

    socket.on('user-info', function(user) {
        $scope.me = user;
    });

    //收到信息
    socket.on('chat-message', function(msg) {
        var defaultDialog = {
            uid: msg.fromUser.id,
            name: msg.fromUser.name,
            msgs: [msg],
            unread: 1
        }
        $scope.$apply(function (){
            updateDialogs(defaultDialog, msg, true);
        })
    });

    socket.on('user-list', function(users) {
        $scope.$apply(function() {
            $scope.users = users;
        })
    });


    //根据uid来更新messages
    function updateDialogs(dialog, msg, unread) {
        var updated = false;
        $scope.dialogs.forEach(function(d) {
            if (d.uid == dialog.uid) {
                d.msgs.push(msg);
                if (unread) {
                    d.unread++;
                }
                updated = true;
            }
        });
        //如果没有则创建diaog
        if (!updated) {
            $scope.dialogs.push(dialog);
        }
    };

    //获取dialog
    function getDialog(dialog) {
        var hasDialog = false;
        $scope.dialogs.forEach(function(d) {
            if (d.uid == dialog.uid) {
                hasDialog = true;
                //每次寻找时都要去掉未读消息
                d.unread = 0;
                dialog = d;
            }
        });
        //如果没有会话则创建
        if (!hasDialog) {
            $scope.dialogs.push(dialog);
        }
        return dialog;
    };

    $scope.$watch('dialogs', function (newV, oldV){
        $scope.totalUnread = 0;
        $scope.dialogs.forEach(function (d){
            $scope.totalUnread += d.unread;
        });
    }, true);
}]);

uranus.controller('LoginCtrl', ['$scope', '$state', function($scope, $state) {
    socket = io("http://139.196.192.129:3000");
    $scope.user = {};
    $scope.submit = function() {
        socket.emit('change-name', $scope.user.name);
        $state.go('chat');
    };
}]);