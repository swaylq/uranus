function getRandomNum() {
    return parseInt(Math.random() * 12 + 1, 10);
}

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


uranus.controller('ChatCtrl', ['$scope', '$state', '$timeout', function($scope, $state, $timeout) {
    moment.locale('zh-cn');
    if (socket == null) {
        $state.go('login');
        return;
    }

    $scope.totalUnread = 0;
    $scope.hasNewUser = false;

    $scope.tab = 'users';
    $scope.users = [];
    $scope.me = null;
    $scope.currentUser = {
        avatar: null,
        uid: null,
        name: null
    };
    $scope.currentDialog = {
        avatar: null,
        uid: null,
        name: null,
        msgs: [],
        unread: 0
    };
    $scope.dialogs = [];

    //切换当前用户
    $scope.switchUser = function(user) {
        $scope.currentUser = user;
    };

    //切换当前会话
    $scope.switchDialog = function(dialog) {
        $scope.currentDialog = getDialog(dialog);
        $timeout(function (){
            $('.messages').scrollTop($('.messages-list').height());
        });
    };

    $scope.switchDialogWithUser = function () {
        //根据userid找dialog
        $scope.currentDialog = getDialog({
            avatar: $scope.currentUser.avatar,
            uid: $scope.currentUser.id,
            name: $scope.currentUser.name,
            msgs: [],
            unread: 0
        });
        $scope.tab = 'dialogs';
    };

    $scope.send = function() {
        var msg = {
            fromUser: $scope.me,
            content: $scope.sendMessage,
            time: moment(new Date()).format("a h:mm:ss")
        };
        //如果不是自己和自己聊天，要把msg加入
        if ($scope.currentDialog.uid != $scope.me.id) {
            updateDialogs($scope.currentDialog, msg, false);
        }
        socket.emit('chat-message', $scope.currentDialog.uid, msg);

        $scope.sendMessage = "";
    };

    //获取用户信息
    socket.emit('get-user-info');
    socket.emit('get-user-list');

    socket.on('user-info', function(user) {
        console.log(user);
        $scope.me = user;
        $scope.currentUser = $scope.me;
    });

    //收到信息
    socket.on('chat-message', function(msg) {
        console.log(msg);
        var defaultDialog = {
            avatar: msg.fromUser.avatar,
            uid: msg.fromUser.id,
            name: msg.fromUser.name,
            msgs: [msg],
            unread: 1
        }
        $scope.$apply(function (){
            updateDialogs(defaultDialog, msg, true);
        });
    });

    socket.on('user-list', function(users) {
        $scope.$apply(function() {
            //当有新的用户，并且当前在会话界面时
            if ($scope.users.length < users.length && $scope.tab == 'dialogs') {
                $scope.hasNewUser = true;
            }
            $scope.users = users;
        })
    });

    //根据uid来更新messages
    function updateDialogs(dialog, msg, unread) {
        var updated = false;
        $scope.dialogs.forEach(function(d) {
            if (d.uid == dialog.uid) {
                d.msgs.push(msg);
                $('.messages').animate({scrollTop: $('.messages-list').height()}, "slow");
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
    socket = io("http://localhost:3000");
    $scope.user = {};
    $scope.submit = function() {
        $scope.user.avatar = 'images/default' + getRandomNum() + '.jpg';
        socket.emit('register', $scope.user);
        $state.go('chat');
    };
}]);