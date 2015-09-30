angular.module( 'orderCloud' )

	.filter('OCRoutingUrl', OCRoutingUrl)
	.filter('OCUrlParams', OCUrlParams)
;

function OCRoutingUrl() {
	return function(value) {
		return value.split('.io/')[1];
	}
}

function OCUrlParams() {
	return function(obj) {
		var paramString = '';
		angular.forEach(obj, function(value, key) {
			if (!value) return;
			paramString += ((paramString.length ? '&' : '?') + key + '=' + value);
		});
		return paramString;
	}
}