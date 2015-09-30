angular.module('orderCloud')

    .config( ApiConsoleConfig )
    .controller('ApiConsoleCtrl', ApiConsoleController)
    .controller('ResponseModalCtrl', ResponseModalController)
	.factory('ApiLoader', ApiLoaderService)
	.factory('LockableParams', LockableParamsService)
	.factory('ApiConsoleService', ApiConsoleService)
	.directive('parameterObject', ParameterObjectDirective)
	.directive('emptyToNull', EmptyToNullDirective)
	.filter('objectParams', objectParams)
;

function objectParams() {
	return function(params) {
		var result = [];
		angular.forEach(params, function(param) {
			if (param.Type == 'object') result.push(param);
		});
		return result;
	}
}

function ApiConsoleConfig( $stateProvider, $urlMatcherFactoryProvider ) {
    $urlMatcherFactoryProvider.strictMode(false);
    $stateProvider.state('base.console', {
        'url': '/console',
        'templateUrl': 'console/templates/console.tpl.html',
        'controller': 'ApiConsoleCtrl',
        'controllerAs': 'console',
        'resolve': {
			OrderCloudSections:  function($q, Docs) {
				var defer = $q.defer();
				Docs.GetAll().then(function(data) {
					defer.resolve(data.Sections);
				});
				return defer.promise;
			},
			OrderCloudResources: function (ApiLoader) {
                return ApiLoader.getResources('orderCloud.sdk');
            }
        },
        'data':{
			limitAccess: true,
			pageTitle: 'API Console'
		}
    });
};

function ApiConsoleController($scope, $resource, $filter, apiurl, OrderCloudResources, ApiConsoleService, LockableParams) {
	var vm = this;
	vm.Resources = OrderCloudResources;
	vm.SelectedResource = null;

	vm.SelectedMethod = "";
	vm.SelectedEndpoint = null;
	vm.Response = null;
	vm.Responses = [];
	vm.SelectedResponse = null;

	vm.isLocked = function(paramName) {
		return LockableParams.IsLocked(paramName);
	};

	vm.unlockParam = function(paramName) {
		LockableParams.RemoveLock(paramName)
	};

	vm.lockParam = function(paramName, paramValue) {
		LockableParams.SetLock(paramName, paramValue)
	};

	vm.setMaxLines = function(editor) {
		editor.setOptions({
			maxLines:200
		});
	};

	vm.Execute = function() {
		ApiConsoleService.ExecuteApi(vm.SelectedResource, vm.SelectedMethod)
			.then( function(data) {
				console.log(data);
				if (!(data.ID || data.Meta)) return;
				vm.Response = $filter('json')(data);
			})
			.catch( function(ex) {
				if (!ex) return;
				vm.Response = $filter('json')(ex);
			});
	};

	vm.SelectResource = function(scope) {
		vm.SelectedResource = scope.resource;
		vm.SelectedResource.Documentation = $resource( apiurl + '/v1/docs/' + vm.SelectedResource.name ).get();
		vm.SelectedMethod = null;
	};

	vm.SelectMethod = function(scope) {
		vm.SelectedMethod = scope.method;
	};

	$scope.$watch(function () {
		return vm.SelectedResource;
	}, function (n, o) {
		if (!n || n === o) return;
		vm.Response = null;
		vm.SelectedEndpoint = null;
		vm.SelectedMethod = '';
	});

	$scope.$watch(function () {
		return vm.SelectedMethod;
	}, function (n, o) {
		if (!n || n == '' || n === o) return;
		vm.Response = null;
		vm.SelectedEndpoint = null;
		if (angular.isDefined(n.params)) {
			console.log('trigger');
			ApiConsoleService.CreateParameters(vm.SelectedResource, n)
				.then(function(data) {
					console.log('trigger 2');
					vm.SelectedEndpoint = data.SelectedEndpoint;
					vm.SelectedMethod.resolvedParameters = data.ResolvedParameters;
				});
		}
	});

	$scope.$on('event:responseSuccess', function(event, c) {
		if (c.config.url.indexOf('.html') > -1 || c.config.url.indexOf('docs/') > -1) return;
		c.data = $filter('json')(c.data);
		vm.Responses.push(c);
		vm.SelectResponse(c);
	});

	$scope.$on('event:responseError', function(event, c) {
		if (c.config.url.indexOf('.html') > -1 || c.config.url.indexOf('docs/') > -1) return;
		c.data = $filter('json')(c.data);
		vm.Responses.push(c);
		vm.SelectResponse(c);
	});

	vm.SelectResponse = function(response) {
		vm.SelectedResponse = response;
	}
}

function ResponseModalController($modalInstance, Response) {
	var vm = this;
	vm.response = Response;

}

function ApiConsoleService($injector, $resource, apiurl, LockableParams) {
	var service = {
		ExecuteApi: _executeApi,
		CreateParameters: _createParameters
	};

	return service;

	/////
	function _executeApi(SelectedResource, SelectedMethod) {
		var params = [];
		angular.forEach(SelectedMethod.resolvedParameters, function(p) {
			if (p.Value == "") return; //Avoid registering blank strings
			params.push(p.Type == 'object' ? JSON.parse(p.Value) : p.Value);
		});
		return $injector.get(SelectedResource.name)[SelectedMethod.name].apply(this, params);
	}

	function _createParameters(SelectedResource, SelectedMethod) {
		var result = {
			SelectedEndpoint: null,
			ResolvedParameters: []
		};
		return $resource( apiurl + '/v1/docs/' + SelectedResource.name + '/' + SelectedMethod.name).get().$promise
			.then( function(data) {
				result.SelectedEndpoint = data;
				analyzeParamters(data);
				return result;
			});

		function analyzeParamters(endpoint) {
			angular.forEach(SelectedMethod.params, function(methodParameter) {
				var isText = false;
				var isRequired = true;
				var isLockable = false;
				var lockedValue = null;
				angular.forEach(LockableParams.Get(), function(value, key) {
					if (methodParameter == key) {
						isLockable = true;
						lockedValue = value
					}
				});
				angular.forEach(endpoint.Parameters, function(parameter) {
					if (parameter.Name == methodParameter) {
						isText = true;
						isRequired = parameter.Required;
					}
				});

				function setValue() {
					if (isText) {
						return lockedValue;
					} else {
						return endpoint.RequestBody ? endpoint.RequestBody.Sample : null;
					}
				}

				var resolvedParameter = {
					Name: methodParameter,
					Type: isText ? 'text' : 'object',
					Value: setValue(),
					Required: isRequired,
					Lockable: isLockable
				};
				result.ResolvedParameters.push(resolvedParameter);
			});
		}
	}
}

function ApiLoaderService($q, $injector) {
	var service = {
		getResources: _getResources
	};

	return service;

	/////
	function _getParamNames (func) {
		var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
		var ARGUMENT_NAMES = /([^\s,]+)/g;
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

		if(result === null) result = [];

		return result;
	};

	function _getResources(moduleName) {
		var deferred = $q.defer();
		var filterFactories = [
			'Auth',
			'Request',
			'Docs',
			'Underscore',
			'Tests',
			'Registration',
			'Credentials',
			'AdminApiClients'
		];
		var services = [];

		angular.forEach(angular.module(moduleName)._invokeQueue, function(component) {
			var componentName = component[2][0];
			if (component[1] == 'factory' && filterFactories.indexOf(componentName) == -1 && componentName.indexOf('Extend') == -1) {
				var factory = {
					name: componentName,
					methods: []
				};
				var f;
				try {
					f =  $injector.get(factory.name);
					angular.forEach(f, function(value, key) {
						var method = {
							name: key,
							fn: value.toString(),
							resolvedParameters: {},
							callerStatement: null,
							results: null,
							params: _getParamNames(value)
						};
						factory.methods.push(method);
					});
				}
				catch (ex) {}

				services.push(factory);
			}
		});
		deferred.resolve(services);

		return deferred.promise;
	};
}

function LockableParamsService($q) {
	var service = {
		Get: _get,
		IsLocked: _isLocked,
		SetLock: _setLock,
		RemoveLock: _removeLock
	};

	var lockableParams = {
		'buyerID':null,
		'page':null,
		'pageSize':null
	};

	return service;

	function _get() {
		return lockableParams;
	}

	function _isLocked(key) {
		return lockableParams[key] ? true : false;
	}

	function _setLock(key, value) {
		var defer = $q.defer();
		lockableParams[key] = value;
		defer.resolve();
		return defer.promise;
	}

	function _removeLock(key) {
		var defer = $q.defer();
		lockableParams[key] = null;
		defer.resolve();
		return defer.promise;
	}
}

function ParameterObjectDirective() {
	var obj = {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ctrl) {
			ctrl.$validators.parameterObject = function(modelValue, viewValue) {
				if (ctrl.$isEmpty(modelValue)) return true;
				try {
					return validateModel(viewValue);
				} catch(ex) {
					return false;
				}
				function validateModel(value) {
					var obj = JSON.parse(value.replace(/\n/g, ''));
					var fieldErrors = 0;
					angular.forEach(scope.console.SelectedEndpoint.RequestBody.Fields, function(field) {
						//TODO: make empty objects and objects that are straight up missing required fields entirely invalid
						angular.forEach(obj, function(value, key) {
							if (key == field.Name && field.Required) {
								switch (field.Type) {
									case('string'):
										if (!angular.isString(value) || !value.length) fieldErrors++;
										break;
									case('boolean'):
										if (typeof(value) != 'boolean') fieldErrors++;
										break;
									case('object'):
										if (!angular.isObject(value)) fieldErrors++;
										break;
									case('integer'):
										if (!angular.isNumber(value)) fieldErrors++;
								}
							}
						})
					});
					return fieldErrors == 0;
				}
			}
		}
	};
	return obj;
}

function EmptyToNullDirective() {
	var directive = {
		restrict: 'A',
		require: 'ngModel',
		link: function (scope, elem, attrs, ctrl) {
			ctrl.$parsers.push(function(viewValue) {
				if(viewValue === "") {
					return null;
				}
				return viewValue;
			});
		}
	};

	return directive;
}