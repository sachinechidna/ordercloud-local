angular.module( 'orderCloud' )
    .factory( 'Context' , ContextService );


function ContextService($rootScope, Credentials, $q) {

    function _setContext (clientID, username, password) {
        var defer = $q.defer();
        $rootScope.clientid = clientID;
        Credentials.Get({Username: username, Password: password})
            .then(function(data) {
                defer.resolve(data);
            }, function(reason) {
                defer.reject(reason);
            });
        return defer.promise;
    }

    function _clearContext() {
        Credentials.Delete();
        $rootScope.clientid = '';
    }

    return {
        setContext: _setContext,
        clearContext: _clearContext
    };
}
