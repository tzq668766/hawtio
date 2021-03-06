module Fabric {


  export function ContainersController($scope, $location, workspace, jolokia) {
    
    $scope.profile = empty();
    $scope.version = empty();
    
    var key = $location.search()['cv'];
    if (key) {
      $scope.version = { id: key };
    }
    
    key = $location.search()['cp'];
    if (key) {
      $scope.profile = { id: key };
    }
    
    
    // caches last jolokia result
    $scope.result = [];
    
    // rows in container table
    $scope.containers = [];
    
    $scope.profiles = [];
    $scope.versions = [];
    
    // selected containers
    $scope.selectedContainers = [];


    $scope.stopContainer = (name) => {
      stopContainer(jolokia, name, () => {
        notification('success', "Stopped " + name);
      }, (response) => {
        notification('error', "Failed to stop " + name + " due to " + response.error);
        console.log("Failed to stop " + name)
      });
    };

    $scope.extractSelected = () => {
      var rc = [];
      $scope.selectedContainers.forEach(function(container) {
        rc.push(container.name);
      });

      $scope.selectedContainers.splice(0, $scope.selectedContainers.length);
      return rc;
    };


    $scope.stop = () => {
      $scope.extractSelected().forEach(function(name) {
        $scope.stopContainer(name);
      });
    };

    $scope.deleteContainer = (name) => {
      destroyContainer(jolokia, name, () => {
        notification('success', "Deleted " + name);
      }, (response) => {
        notification('error', "Failed to delete " + name + " due to " + response.error);
      });
    };

    $scope.delete = () => {
      $scope.extractSelected().forEach(function (name) {
        $scope.deleteContainer(name);
      });
    };

    $scope.startContainer = (name) => {
      startContainer(jolokia, name, () => {
        notification('success', "Started " + name);
      }, (response) => {
        notification('error', "Failed to start " + name + " due to " + response.error);
      });
    };

    $scope.start = () => {
      $scope.extractSelected().forEach(function (name) {
        $scope.startContainer(name);
      });
    };

    $scope.connect = (row) => {
      if (row) {
        // TODO lets find these from somewhere! :)
        var userName = "admin";
        var password = "admin";
        Fabric.connect(row, userName, password, true);
      }
    };

    $scope.anySelectionAlive = (state) => {
      var selected = $scope.selectedContainers || [];
      return selected.length && selected.any((s) => s.alive === state);
    };

    $scope.everySelectionAlive = (state) => {
      var selected = $scope.selectedContainers || [];
      return selected.length && selected.every((s) => s.alive === state);
    };

    $scope.statusIcon = (row) => {
      if (row) {
        if (row.alive) {
          switch(row.provisionResult) {
            case 'success':
              return "green icon-play-circle";
            case 'downloading':
              return "icon-download-alt";
            case 'installing':
              return "icon-hdd";
            case 'analyzing':
            case 'finalizing':
              return "icon-refresh icon-spin";
            case 'resolving':
              return "icon-sitemap";
            case 'error':
              return "red icon-warning-sign";
          }
        } else {
          return "orange icon-off";
        }
      }
      return "icon-refresh icon-spin";
    };

    /*
    var SearchProvider = function(scope, location) {
      var self = this;
      self.scope = scope;
      self.location = location;

      self.callback = function(newValue, oldValue) {
        if (newValue === oldValue) {
          return;
        }
        if (newValue.id === oldValue.id) {
          return;
        }
        self.scope.profiles = activeProfilesForVersion(self.scope.version.id, self.scope.containers);
        self.scope.profile = setSelect(self.scope.profile, self.scope.profiles);
        
        var q = location.search();
        q['cv'] = self.scope.version.id;
        q['cp'] = self.scope.profile.id;
        location.search(q);
        
        self.evalFilter();
      };
      
      self.scope.$watch('version', self.callback);
      self.scope.$watch('profile', self.callback);

      self.init = function(childScope, grid) {
        self.grid = grid;
        self.childScope = childScope;
        grid.searchProvider = self;
      };
      
      self.evalFilter = function() {

        var byVersion = self.grid.sortedData;
        if (self.scope.version.id !== "" ) {
          byVersion = self.grid.sortedData.findAll(function(item) { return item.version === self.scope.version.id });
        }

        var byProfile = byVersion;
        
        if (self.scope.profile.id !== "" ) {
          byProfile = byVersion.findAll(function(item) { return item.profileIds.findIndex(function(id) { return id === self.scope.profile.id }) !== -1 });
        }
        
        self.grid.filteredData = byProfile;
        self.grid.rowFactory.filteredDataChanged();
      };
      
    };
    
    var searchProvider = new SearchProvider($scope, $location);
    */
    
    $scope.containerOptions = {
      data: 'containers',
      showFilter: false,
      showColumnMenu: false,
      filterOptions: {
        filterText: ''
      },
      selectedItems: $scope.selectedContainers,
      rowHeight: 32,
      showSelectionCheckbox: true,
      selectWithCheckboxOnly: true,
      keepLastSelected: false,
      multiSelect: true,
      columnDefs: [
        { 
          field: 'status',
          displayName: 'Status',
          cellTemplate: '<div class="ngCellText pagination-centered"><i class="icon1point5x {{row.getProperty(col.field)}}"></i></div>',
          width: 56,
          resizable: false
        },
        {
          field: 'jolokiaUrl',
          displayName: 'Connect',
          headerCellTemplate: '<div ng-click="col.sort()" class="ngHeaderSortColumn {{col.headerClass}}" ng-style="{\'cursor\': col.cursor}" ng-class="{ \'ngSorted\': !noSortVisible }"><div class="ngHeaderText colt{{$index}} pagination-centered" title="Connect to container"><i class="icon-cloud"></i></div><div class="ngSortButtonDown" ng-show="col.showSortButtonDown()"></div><div class="ngSortButtonUp" ng-show="col.showSortButtonUp()"></div></div>',
          cellTemplate: '<div class="ngCellText pagination-centered"><a href="" ng-show="row.entity.jolokiaUrl" title="Open a new window and connect to this container" ng-click="connect(row.entity)"><i class="icon-signin"></i></a></div>',
          width: 48
        },
        {
          field: 'name',
          displayName: 'Name',
          cellTemplate: '<div class="ngCellText"><a href="#/fabric/container/{{row.getProperty(col.field)}}{{hash}}">{{row.getProperty(col.field)}}</a></div>',
          width: 200
        },
        {
          field: 'version',
          displayName: 'Version',
          cellTemplate: '<div class="ngCellText pagination-centered"><a href="#/fabric/profiles?pv={{row.getProperty(col.field)}}">{{row.getProperty(col.field)}}</a></div>',
          width: 70
        },
        {
          field: 'services',
          displayName: 'Services',
          cellTemplate: '<div class="ngCellText"><ul class="unstyled inline"><li ng-repeat="service in row.getProperty(col.field)" ng-switch="service.type"><i ng-switch-when="icon" class="{{service.src}}" title="{{service.title}}"></i><img ng-switch-when="img" ng-src="{{service.src}}" title="{{service.title}}"></li></ul>',
          width: 200
        },
        {
          field: 'profileIds',
          displayName: 'Profiles',
          cellTemplate: '<div style="whitespace: wrap;" class="ngCellText"><ul class="inline unstyled"><li ng-repeat="profile in row.getProperty(col.field)"><a ng-href="#/fabric/profile/{{row.entity.version}}/{{profile}}">{{profile}}</a></li></div>',
          width: 900
          
        }
      ]
    };
  
    Core.register(jolokia, $scope, {
      type: 'exec', mbean: managerMBean,
      operation: 'containers()',
      arguments: []
    }, onSuccess(render));
    
    function empty() {
      return [{id: ""}];
    }
    
    function activeProfilesForVersion(version, containers) {
      if (version === "") {
        return activeProfiles(containers);
      }
      var answer = empty();
      containers.findAll(function(container) { return container.version === version }).forEach(function(container) {
        answer = answer.union(container.profileIds.map(function(id) { return {id: id}; }));
      });
      return answer;
    }
    
    function activeProfiles(containers) {
      var answer = empty();
      containers.forEach(function (container) { answer = answer.union(container.profileIds.map( function(id) { return { id: id }}))});
      return answer;
    }
    
    function render(response) {
      if (!Object.equal($scope.result, response.value)) {

        $scope.result = response.value;

        $scope.containers = [];
        $scope.profiles = empty();
        $scope.versions = empty();
        
        $scope.result.forEach(function (container) {
          
          var services = getServiceList(container);
          
          $scope.profiles = $scope.profiles.union(container.profileIds.map(function(id) { return {id: id}; }));
          $scope.versions = $scope.versions.union([{ id: container.versionId }]);
          
          $scope.containers.push({
            name: container.id,
            alive: container.alive,
            version: container.versionId,
            status: $scope.statusIcon(container),
            services: services,
            profileIds: container.profileIds,
            jolokiaUrl: container.jolokiaUrl
          });
        });

        $scope.version = setSelect($scope.version, $scope.versions);        
        $scope.profiles = activeProfilesForVersion($scope.version.id, $scope.containers);
        $scope.profile = setSelect($scope.profile, $scope.profiles);

        $scope.$apply();
      }
    }

  }
}
