var app = angular.module('catServer',['jsonFormatter', 'nvd3', 'ngTable']);
app.controller('myController', function($scope, $http) {
    $scope.data = [];
    $scope.chartOptions = {
        chart: {
            type: 'pieChart',
            height: 500,
            x: function(d){return d.key;},
            y: function(d){return d.y;},
            showLabels: true,
            duration: 500,
            labelThreshold: 0.01,
            labelSunbeamLayout: true,
            legend: {
                margin: {
                    top: 5,
                    right: 35,
                    bottom: 5,
                    left: 0
                }
            }
        }
    };

    $http.get('/cat').success(function(data) {
        $scope.data = data;
    }).error(function(data){
        console.log('Error: ' + data);
    });

    $http.get('/catGraph').success(function(data) {
        $scope.chartData = data.chartData;
        $scope.ownersData = data.ownersData;
        $scope.providersData = data.providersData;
        $scope.tableParams1 = new NgTableParams({}, {});
        console.log(data);
    }).error(function(data){
        console.log('Error: ' + data);
    });
});