myApp.factory('focus', function ($timeout) {
    return function (id) {
        // timeout makes sure that is invoked after any other event has been triggered.
        // e.g. click events that need to run before the focus or
        // inputs elements that are in a disabled state but are enabled when those events
        // are triggered.
        $timeout(function () {

            var element = document.getElementById(id);
            if (element)
                element.focus();
        });
    };
});



myApp.controller("LanguageCtrl",
    function ($scope, $rootScope, $cookieStore, strings) {



        $rootScope.changeLanguage = function (languageAbbreviation) {

            angular.forEach($rootScope.languages, function (element, index) {
                if (element.abbreviation == languageAbbreviation) {
                    $rootScope.lang = element;
                    $cookieStore.put("language", $rootScope.lang);
                    $rootScope.reload();
                    return;
                }
            });

        }

        $rootScope.languages = [{
            abbreviation: "pt_BR",
            title: "Portuguese"
        }, {
            abbreviation: "en_US",
            title: "English"
        }];



        $rootScope.lang = $cookieStore.get("language");
        if (!$rootScope.lang) {
            angular.forEach($rootScope.languages, function (element, index) {
                $rootScope.lang = element;
                return;
            });
        }

        /*Strings */
        $scope.strings = strings;

        $rootScope.getString = function (string) {
            for (var str in $scope.strings) {
                if (str == string) {
                    return (($scope.strings)[str])[$rootScope.lang.abbreviation];
                }
            }
        }




    });

/******************************************************************************/
/****************************ListCtrl******************************************/
/******************************************************************************/
myApp.controller("ListCtrl",
    function ($scope, $rootScope, menuTree, focus) {
        focus("filter");


        $scope.data = [

            {
                title: "Title",
                desc: "Description",
                clickable: true,
                queryValue: "",
                menuMatch: "academic"
            }];

        $rootScope.$on("requestList", function (event, queryValue, menu, strings) {


            $rootScope.listLoaded = false;
            $scope.listFilter = "";

            $scope.querySuccess = function (response) {
                var json = JSON.parse(response);
                var results = (json.results.bindings);

                var title = [],
                    desc = [],
                    clickable = [],
                    queryValue = [],
                    menuMatch = [];
                for (var i = 0; i < results.length; i++) {
                    title[i] = results[i].title.value;
                    desc[i] = results[i].desc.value;
                    queryValue[i] = results[i].queryValue.value;
                    menuMatch[i] = menu;
                    clickable[i] = getQuery(menu, menuTree).results.clickable;

                    $scope.data.push({
                        "title": title[i],
                        "desc": desc[i],
                        "clickable": clickable[i],
                        "queryValue": queryValue[i],
                        "menuMatch": menuMatch[i]
                    });


                }

                $rootScope.listLoaded = true;

                $scope.$apply();
            }

            $scope.queryFail = function (response) {

                $scope.data = [{
                    "title": $rootScope.getString("error"),
                    "desc": $rootScope.getString("error_cin_connection"),
                    "clickable": false,
                    "queryValue": "",
                    "menuMatch": $rootScope.selected.name
                }];

                $rootScope.listLoaded = true;

                $scope.$apply();
            }

            $scope.data = [];

            var queryString = getQuery(menu, menuTree);
            var sparql = queryString.sparql;
            var sparql = sparql.replace("%%%", queryValue);


            query(
                sparql,
                "json",
                $scope.querySuccess,
                $scope.queryFail);

        });


        $scope.click = function (queryValue, menuMatch) {


            $rootScope.$emit("menuChangeEvent", queryValue, menuMatch);
            $rootScope.$emit("requestList", queryValue, $rootScope.selected.name);

        }


        /*First menu is home*/
        $scope.click("", "home");


    });

/******************************************************************************/
/****************************MenuCtrl******************************************/
/******************************************************************************/

myApp.controller("MenuCtrl",
    function ($scope, $rootScope, $window, menuTree) {




        /*Current menu handling*/
        /*{
            level: "home",
            queryValue: ""
        }*/
        $scope.currentMenuStack = [];

        $rootScope.selected = {};

        $rootScope.$on("menuChangeEvent", function (event, queryValue, menuMatch) {





            $scope.currentMenuStack.push({
                level: menuMatch,
                title: getAttribute(menuMatch, "title", menuTree)[$rootScope.lang.abbreviation],
                queryValue: queryValue
            });


            var childMenu = getChildMenuKeys(last($scope.currentMenuStack).level, menuTree)[0];

            $scope.currentMenu = [];

            var changedSelected = false;
            for (var key in childMenu) {
                if (key != "title" && key != "query" && key != "icon") {
                    if (!changedSelected) {
                        changedSelected = true;
                        $rootScope.selected.name = key;
                        $rootScope.selected.title = getAttribute(key, "title", menuTree)[$rootScope.lang.abbreviation];
                    }
                    $scope.currentMenu.push({
                        name: key,
                        queryValue: queryValue,
                        title: getAttribute(key, "title", menuTree)[$rootScope.lang.abbreviation],
                        icon: getAttribute(key, "icon", menuTree)
                    });
                }
            }

        });




        $rootScope.reload = function () {
            $window.location.reload();
        }
        $scope.click = function (queryValue, menuName) {
            $rootScope.$emit("requestList", queryValue, menuName);
            $rootScope.selected = {
                name: menuName,
                title: getAttribute(menuName, "title", menuTree)[$rootScope.lang.abbreviation]
            }
        }


        $scope.back = function (itemStack) {
            var cms = $scope.currentMenuStack;
            console.log(cms);
            for (var i = 0; i < cms.length; i++) {
                if (cms[i].level == itemStack.level) {
                    if (i != 0) {
                        $scope.currentMenuStack = cms.slice(0, i - 1);
                        $scope.click(itemStack.queryValue, itemStack.level);
                        console.log(itemStack.filter);

                        $rootScope.$emit("menuChangeEvent", cms[i - 1].queryValue, cms[i - 1].level);
                        break;
                    } else {
                        $scope.reload();
                    }
                    break;
                }
            }
        }

        focus("filter");


    });


/******************************************************************************/
/****************************Other Functions***********************************/
/******************************************************************************/


function getAttribute(level, attribute, obj) {
    if (level == "home") return "Home";
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {

        }
        if (i == level) {
            return ((obj[i])[0])[attribute];
        } else {
            var t = (getChildMenuKeys(level, obj[i]))[0];
            return t[attribute];
        }
    }
}

function getQuery(key, obj) {

    var attr = getAttribute(key, "query", obj);

    return attr;

}

function getChildMenuKeys(key, obj) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getChildMenuKeys(key, obj[i]));
        }
        if (i == key) {
            objects.push(obj[i]);
        }
    }
    return objects;
}


var last = function (array) {
    return array[array.length - 1];
}
