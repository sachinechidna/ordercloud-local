angular.module( 'orderCloud' )

	.config( LoginConfig )
	.controller( 'LoginCtrl', LoginController )

;

function LoginConfig( $stateProvider ) {
	$stateProvider.state( 'login', {
		url: '/login',
		templateUrl:'login/templates/login.tpl.html',
		controller:'LoginCtrl',
		controllerAs: 'login',
		data:{
			limitAccess: false //Whether or not to require authentication on this state
		}
	});
}

function LoginController( $rootScope, $state, Credentials ) {
	var vm = this;

	vm.submit = function( ) {
		console.log('hit');
		Credentials.Get( vm.credentials )
			.then(function() {
				console.log('hit 2');
				$rootScope.isAuthenticated = true;
				$state.go( 'base.dashboard' );
			}).catch(function( ex ) {
				console.dir( ex );
			});
	};
}
