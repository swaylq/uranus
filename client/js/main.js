var baseUrl = 'http://139.196.192.129:3000';

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

    $scope.searchContent = '';
    $scope.searchContentForDialog = '';

    $scope.tab = 'users';
    $scope.users = [];

    $scope.selectedUsers = [];

    $scope.me = null;
    $scope.currentUser = {
        avatar: null,
        uid: null,
        name: null
    };
    $scope.currentDialog = {
        avatar: null,
        did: null,
        name: null,
        msgs: [],
        unread: 0
    };
    $scope.dialogs = [];

    $scope.showMembers = function() {
        //当人数大于2才展开
        if ($scope.currentDialog.users.length > 1) {
            if ($('.member-list').height() > 0) {
                $('.member-list').height(0);
            } else {
                $('.member-list').height(200);
            }
        }
    };

    $scope.addToDialog = function(user) {
        user.selected = !user.selected;
        updateSelectedUsers();
    };

    //创建新的对话
    $scope.createDialog = function() {
        if ($scope.selectedUsers.length > 0) {
            $scope.selectedUsers.push($scope.me);
            socket.emit('create-dialog', $scope.selectedUsers);
            $scope.selectedUsers.forEach(function(user) {
                user.selected = false;
            });
            $scope.selectedUsers = [];
        }
    };

    //切换当前用户
    $scope.switchUser = function(user) {
        $scope.currentUser = user;
    };

    //切换当前会话
    $scope.switchDialog = function(dialog) {
        $scope.currentDialog = getDialog(dialog);
        $timeout(function() {
            $('.messages').scrollTop($('.messages-list').height());
        });
    };

    $scope.switchDialogWithUser = function() {
        //根据userid找dialog
        var defaultDialog = {
            avatar: $scope.currentUser.avatar,
            did: $scope.currentUser.id,
            name: $scope.currentUser.name,
            users: [$scope.currentUser],
            msgs: [],
            unread: 0
        }
        $scope.currentDialog = getDialog(defaultDialog);
        $scope.tab = 'dialogs';
    };

    $scope.send = function() {
        if (!$scope.currentDialog.did) {
            alert('没有选择对话');
            return;
        }

        if (!$scope.sendMessage) {
            alert('发送消息不能为空');
            return;
        }
        var msg = {
            fromUser: $scope.me,
            dialog: {
                name: $scope.currentDialog.name,
                avatar: $scope.currentDialog.avatar,
                did: $scope.currentDialog.did
            },
            content: $scope.sendMessage,
            time: moment(new Date()).format('a h:mm:ss')
        };

        //更新dialog，把自己说的话更新进去
        updateDialogs($scope.currentDialog, msg, false);
        socket.emit('chat-message', msg);
        $scope.sendMessage = '';
    };

    var delivery = new Delivery(socket);
    delivery.on('delivery.connect', function(delivery) {
        $('#sendFile').on('change', function() {
            if ($scope.currentDialog.did) {
                var file = $(this)[0].files[0];
                if (file) {
                    var msg = {
                        fromUser: $scope.me,
                        dialog: {
                            name: $scope.currentDialog.name,
                            avatar: $scope.currentDialog.avatar,
                            did: $scope.currentDialog.did
                        },
                        content: file.name,
                        time: moment(new Date()).format('a h:mm:ss')
                    };
                    var extraParams = {
                        foo: 'bar',
                        msg: msg
                    };
                    console.log('send file');
                    $(this).val(null);
                    delivery.send(file, extraParams);
                }
            }
        });
    });

    //获取用户信息
    socket.emit('get-user-info');
    socket.emit('get-user-list');

    socket.on('user-info', function(user) {
        console.log('recieve user info', user);
        $scope.me = user;
        $scope.currentUser = $scope.me;
    });

    //收到信息
    socket.on('chat-message', function(msg) {
        console.log('recieve chat message', msg);
        //如果不是自己发的，才去更新消息
        if (msg.fromUser.id != $scope.me.id || msg.fileUrl) {
            if (msg.fileUrl) {
                msg.fileUrl = baseUrl + msg.fileUrl;
            }
            var defaultDialog = {};
            //如果不为讨论组的对话，则根据fromUser来寻找或生成对话
            if (msg.dialog.did == $scope.me.id) {
                defaultDialog = {
                    avatar: msg.fromUser.avatar,
                    did: msg.fromUser.id,
                    name: msg.fromUser.name,
                    users: [msg.fromUser],
                    msgs: [msg],
                    unread: 1
                };
            } else {
                //如果位讨论组的对话，则直接根据msg的dialog信息里的did去寻找，因为一定创建了
                defaultDialog = {
                    did: msg.dialog.did
                }
            }
            $scope.$apply(function() {
                updateDialogs(defaultDialog, msg, true);
            });
        }
    });

    //更新用户列表
    socket.on('user-list', function(users) {
        console.log('recieve user list', users);
        $scope.$apply(function() {
            //当有新的用户，并且当前在会话界面时
            if ($scope.users.length < users.length && $scope.tab == 'dialogs') {
                $scope.hasNewUser = true;
            }
            $scope.users = users;
        })
    });

    //收到加入讨论组的信息
    socket.on('join-dialog', function(dialog) {
        console.log('recieve join dialog', dialog);
        socket.emit('join-dialog', dialog.did);
        var defaultDialog = {
            avatar: 'images/dialog.png',
            did: dialog.did,
            name: dialog.name,
            users: dialog.users,
            msgs: [],
            unread: 0
        };
        $scope.$apply(function() {
            updateDialogs(defaultDialog, null, false);
            $scope.tab = 'dialogs';
            $scope.currentDialog = defaultDialog;
        });
    });

    //根据did来更新messages
    function updateDialogs(dialog, msg, unread) {
        var updated = false;
        $scope.dialogs.forEach(function(d) {
            if (d.did == dialog.did) {
                if (msg) {
                    d.msgs.push(msg);
                }
                $('.messages').animate({
                    scrollTop: $('.messages-list').height()
                }, 'slow');
                if (unread) {
                    d.unread++;
                }
                updated = true;
            }
        });
        //如果没有则创建diaog
        if (!updated) {
            console.log('create new dialog');
            $scope.dialogs.push(dialog);
        }
    };

    //获取dialog
    function getDialog(dialog) {
        var hasDialog = false;
        $scope.dialogs.forEach(function(d) {
            if (d.did == dialog.did) {
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

    //更新选择的用户
    function updateSelectedUsers() {
        var selectedUsers = [];
        $scope.users.forEach(function(user) {
            if (user.selected) {
                selectedUsers.push(user);
            }
        });
        $scope.selectedUsers = selectedUsers;
    };

    $scope.$watch('dialogs', function(newV, oldV) {
        $scope.totalUnread = 0;
        $scope.dialogs.forEach(function(d) {
            $scope.totalUnread += d.unread;
        });
    }, true);
}]);

uranus.controller('LoginCtrl', ['$scope', '$state', function($scope, $state) {
    socket = io(baseUrl);
    $scope.user = {};
    $scope.submit = function() {
        $scope.user.avatar = 'images/default' + getRandomNum() + '.jpg';
        socket.emit('register', $scope.user);
        $state.go('chat');
    };
}]);