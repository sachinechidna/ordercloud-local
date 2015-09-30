angular.module( 'orderCloud' )

	.config( DocsConfig )
	.controller( 'DocsCtrl', DocsController )
	.controller( 'DocsResourceCtrl', DocsResourceController )
	.factory( 'DocsService', DocsService )
;

function DocsConfig( $stateProvider ) {
	$stateProvider
		.state( 'base.docs', {
			url: '/docs',
			templateUrl:'docs/templates/docs.tpl.html',
			controller:'DocsCtrl',
			controllerAs: 'docs',
			resolve: {
				Documentation: function(Docs) {
					return Docs.GetAll();
				}
			}
		})
		.state( 'base.docs.resource', {
			url: '/:resourceID',
			templateUrl: 'docs/templates/resource.tpl.html',
			controller: 'DocsResourceCtrl',
			controllerAs: 'docsResource',
			resolve: {
				SelectedResource: function($q, Docs, DocsService, $stateParams) {
					var d = $q.defer();
					Docs.GetResource($stateParams.resourceID)
						.then(function(data) {
							DocsService.SetActiveSection(data.Section);
							d.resolve(data);
						});
					return d.promise;
				}
			}
		})
}

function DocsController( $scope, DocsService, Documentation ) {
	var vm = this;
	vm.content = Documentation;
	$scope.$watch(function() {
		return DocsService.GetActiveSection();
	}, function(n,o) {
		if (!n) return;
		vm.activeSection = n;
	});

	vm.setMaxLines = function(editor) {
		editor.setOptions({
			maxLines:100
		});
	};

	vm.ReadmeScripts = [
		"{\n\t\"Meta\": {\n\t\t\"Page\": 1,\n\t\t\"PageSize\": 20,\n\t\t\"TotalCount\": 25,\n\t\t\"TotalPages\": 2,\n\t\t\"ItemRange\": [1,20]\n\t}\n}",
		"[{\n\t\"ErrorCode\": \"FirstNameRequired\",\n\t\"Message\": \"First Name is required.\"\n},\n{\n\t\"ErrorCode\": \"LastNameRequired\",\n\t\"Message\": \"Last Name is required.\"\n}]"
	];
}

function DocsResourceController ( SelectedResource, DocsService ) {
	var vm = this;
	vm.current = SelectedResource;

	DocsService.SetActiveSection(vm.current.Section);

	vm.setMaxLines = function(editor) {
		editor.setOptions({
			maxLines:100
		});
	};
}

function DocsService(  ) {
	var service = {
		GetActiveSection: _getActiveSection,
		SetActiveSection: _setActiveSection
	};

	var section = null;

	function _getActiveSection() {
		return section;
	}

	function _setActiveSection(value) {
		section = value;
	}

	return service;
}