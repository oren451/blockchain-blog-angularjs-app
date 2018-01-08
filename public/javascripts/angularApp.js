'use strict'
var angularApp = angular.module('blockchainBlog',
  ['ui.router', 'auth0', 'angular-storage', 'angular-jwt', 'ngMaterial']);

angularApp.config([
  '$provide',
  'authProvider',
  '$stateProvider',
  '$urlRouterProvider',
  '$httpProvider',
  'jwtInterceptorProvider',
  function($provide, authProvider, $stateProvider, $urlRouterProvider, $httpProvider, jwtInterceptorProvider) {
    authProvider.init({
      domain: 'blockchainblog.auth0.com',
      clientID: 'l0bhTMUYEbzBkT6PMaeXuBhUruREwiZR'
    });

    jwtInterceptorProvider.tokenGetter = function(store) {
      return store.get('id_token');
    };

    $stateProvider
      .state('login', {
        url: '/login',
        templateUrl: '/login.html',

      })
      .state('profile', {
        url: '/profile',
        templateUrl: '/profile.html',
        controller: 'profileController as user'
      })
      .state('home', {
        url: '/home',
        templateUrl: '/home.html',
        controller: 'MainCtrl',
        resolve: {
          postPromise: ['posts', function(posts) {
            return posts.getAll();
          }]
        }
      })
      .state('posts', {
        url: '/posts/{id}',
        templateUrl: '/posts.html',
        controller: 'PostsCtrl',
        resolve: {
          post: ['$stateParams', 'posts', function($stateParams, posts) {
            return posts.get($stateParams.id);
          }]
        }
      });

    $urlRouterProvider.otherwise('/login');

    function redirect($q, $injector, store, $location) {
      return {
        responseError: function(rejection) {
          var auth = $injector.get('auth0');
          if (rejection.status === 401) {
            auth.signout();
            store.remove('profile');
            store.remove('id_token');
            $location.path('/login');
          }
          return $q.reject(rejection);
        }
      }
    }

    $provide.factory('redirect', redirect);
    $httpProvider.interceptors.push('redirect');
    $httpProvider.interceptors.push('jwtInterceptor');
  }
]);

angularApp.factory('posts', ['$http', function($http) {
  var o = {
    posts: []
  };

  o.get = function(id) {
    return $http.get('/posts/' + id).then(function(res) {
      return res.data;
    });
  };

  o.getAll = function() {
    return $http.get('/posts').then(function(data) {
      angular.copy(data, o.posts);
    });
  };

  o.create = function(post) {
    return $http.post('/posts', post)
      .then(function(data) {
        o.posts.push(data);
      });
  };

  o.upvote = function(post) {
    return $http.put('/posts/' + post._id + '/upvote', )
      .then(function(data) {
        post.upvotes += 1;
      });
  };

  o.addComment = function(id, comment) {
    return $http.post('/posts/' + id + '/comments', comment);
  };

  o.upvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote')
      .then(function(data) {
        comment.upvotes += 1;
      });
  };

  return o;
}]);
angularApp.controller('MainCtrl', [
  '$scope',
  'posts',
  function($scope, posts) {

    $scope.posts = posts.posts;

    $scope.addPost = function() {
      if ($scope.title === '') {
        return;
      }
      posts.create({
        title: $scope.title,
        link: $scope.link,
      });
      $scope.title = '';
      $scope.link = '';
    };

    $scope.incrementUpvotes = function(post) {
      posts.upvote(post);
    };
  }
]);
angularApp.controller('PostsCtrl', [
  '$scope',
  'posts',
  'post',
  function($scope, posts, post) {
    $scope.post = post;

    $scope.addComment = function() {
      if ($scope.body === '') {
        return;
      }
      posts.addComment(post._id, {
        body: $scope.body,
        author: 'user',
      }).then(function(comment) {
        $scope.post.comments.push(comment);
      });
      $scope.body = '';
    };

    $scope.incrementUpvotes = function(comment) {
      posts.upvoteComment(post, comment);
    };
  }
]);

angularApp.controller('profileController', ['$http', 'store', function($http, store) {

  var vm = this;
  vm.getMessage = getMessage;
  vm.getSecretMessage = getSecretMessage;
  vm.message;

  vm.profile = store.get('profile');

  function getMessage() {
    $http.get('http://localhost:3000/api/public', {
      skipAuthorization: true
    }).then(function(response) {
      vm.message = response.data.message;
    });
  }

  function getSecretMessage() {
    $http.get('http://localhost:3000/api/private').then(function(response) {
      vm.message = response.data.message;
    });
  }
}]);

angularApp.controller('toolbarController', ['$scope','auth', 'store', '$location',
  function($scope, auth, store, $location) {

    var vm = this;
    vm.login = $scope.login;
    vm.logout = $scope.logout;
    vm.auth = auth;

    $scope.login = function() {
      console.log('login');
      auth.signin({}, function(profile, token) {
        store.set('profile', profile);
        store.set('id_token', token);
        $location.path('/home');
      }, function(error) {
        console.log(error);
      });
    }

    $scope.logout = function() {
      console.log('logout');
      store.remove('profile');
      store.remove('id_token');
      auth.signout();
      $location.path('/login');
    }
  }
]);

angularApp.run(['$rootScope', 'auth', 'store', 'jwtHelper', '$location',
  function($rootScope, auth, store, jwtHelper, $location) {
    $rootScope.$on('$locationChangeStart', function() {
      var token = store.get('id_token');
      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          if (!auth.isAuthenticated) {
            auth.authenticate(store.get('profile'), token);
          }
        }
      } else {
        $location.path('/login');
      }
    });
  }
]);
