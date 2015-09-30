angular.module( 'orderCloud' )

	.config( DashboardConfig )
	.controller( 'DashboardCtrl', DashboardController )

;

function DashboardConfig( $stateProvider ) {
	$stateProvider
		.state( 'base.dashboard', {
			url: '/dashboard',
			templateUrl:'dashboard/templates/dashboard.tpl.html',
			controller:'DashboardCtrl',
			controllerAs: 'dashboard'
		})
}

function DashboardController( ) {
	var vm = this;
}
