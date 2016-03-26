import _ from 'underscore';
import Singleton from 'molecule-singleton';

const PATH_DELIMITER = '/';
const PARAM_MARKER = ':';
const FRAGMENT_WILDCARD = '*';
const QS_MARKER = '?';
const MODE_STANDARD = 0;
const MODE_PARAM = 1;
const MODE_WILDCARD = 2;

export default Singleton('router', {

  __construct() {
    this._routes = {};
    this._supportsHistory = 'history' in window;
  },

  /**
   * Bulk add routes. Name will be determined by path, eg: /this/page/thing/:id -> this.page.thing.id
   */
  addRoutes(routes) {
    Object.keys(routes).forEach((path) => {
      let name = path.replace(/\//g, '.').replace(/(^\.|:|\.$)/g, '');
      this.addRoute(name, path, routes[path]);
    });
  },

  addRoute(name, path, callback) {
    this._routes[name] = {
        path: path,
        callbacks: []
    };

    _.defaults(this._routes[name], this._compilePath(path));

    if (typeof callback === 'function') {
        this._routes[name].callbacks.push(callback);
    }
  },

  on(route, callback) {
    if (route in this._routes) {
        this._routes[route].callbacks.push(callback);
    }
  },

  go(route, params, updateUrl = true) {

    var url,
        oldUrl,
        qs = [];

    // Look for the route by name in the list
    if (!!this._routes[route]) {

        url = this._routes[route].path;
        oldUrl = url;

        this._routes[route].callbacks.forEach((callback) => {
            var addParams = callback(params);

            // If the callback returned additional parameters, add them to the list
            // so that all values are correctly represented in the final URL
            if (typeof addParams === 'object') {
                _.defaults(params, addParams);
            }
        });

        if (this._supportsHistory) {
            _.each(params, function(value, key) {
                url = url.replace(new RegExp('(\\*|\\:)' + key), value);

                // If the parameter wasn't found as part of the route, throw it on the query string
                if (oldUrl === url) {
                    qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                }

                oldUrl = url;
            });

            url = qs.length ? url + '?' + qs.join('&') : url;

            // Don't push the index page
            if (url !== 'index' && updateUrl) {
              window.history.pushState({
                  route: route,
                  params: params
              }, null, url);
            }
        }

    } else {

        // Otherwise, match against a path
        route = this._getRouteFromPath(route);

    }
  },

  _getRouteFromPath(path) {

    let result;
    let routes = [];
    let params = {};

    // Root gets renamed to index
    path = path === '/' ? 'index' : path;

    for (let i in this._routes) {
      if (this._routes.hasOwnProperty(i)) {
        let route = this._routes[i];
        result = route.regEx.exec(path);

        if (result) {
          _.each(route.map, function(name, index) {
            params[name] = result[index];
          });

          routes.push({
            name: i,
            params
          });
        }
      }
    }

    // Go to the highest weighted route
    if (routes.length) {
      routes.sort((a, b) => {
        return a.weight > b.weight ? -1 : 1;
      });
      let route = routes.shift();
      this.go(route.name, route.params, false);
    }

  },

  /**
   * Generates a regular expression so that a path can be tracked back to its route
   */
  _compilePath(path) {
    let regExStr = '^';
    let paramName = '';
    let mode = MODE_STANDARD;
    let character;
    let paramCount = 1;
    let paramMap = {};
    let hasQueryString = false;
    let wildCards = 0;

    for (let i = 0, count = path.length; i < count; i++) {

      // If this route has already parsed a querystring placeholder, throw an error
      // because that must be the last part of a route if it's present
      if (hasQueryString) {
        throw 'Cannot have additional path/parameters after a query string marker';
        return;
      }

      character = path.charAt(i);

      if (MODE_PARAM === mode) {
        // A parameter marker in a character is invalid
        if (PARAM_MARKER === character) {
          throw 'Invalid character in route path';
          return;
        } else if (PATH_DELIMITER === character) {
          regExStr += '([^\\/]+)\\/';
          paramMap[paramCount] = paramName;
          paramName = '';
          mode = MODE_STANDARD;
          paramCount++;
        } else {
          paramName = paramName.concat(character);
        }
      } else if (MODE_WILDCARD === mode) {
        if (PATH_DELIMITER !== character) {
          throw 'Wildcards must end a route or be followed by a path marker';
        }
        regExStr += '([\\w\\/-]+)';
        mode = MODE_STANDARD;
        wildCards++;
      } else {
        if (PARAM_MARKER === character) {
          mode = MODE_PARAM;
        } else if (FRAGMENT_WILDCARD === character) {
          mode = MODE_WILDCARD;
        } else if (QS_MARKER === character) {
          hasQueryString = true;
          regExStr += '([\w]+)';
        } else if (PATH_DELIMITER === character) {
          regExStr += '\\/';
        } else {
          regExStr += character;
        }
      }
    }

    // If the route ended on a parameter, handle it
    if (paramName.length > 0) {
      regExStr += '([^\\/]+)';
      paramMap[paramCount] = paramName;

    // Handle ending on a wild card
    } else if (MODE_WILDCARD === mode) {
      regExStr += '([\\w\\/-]+)';
    }

    regExStr += '$';
    let regEx = new RegExp(regExStr, 'ig');

    return {
      regEx,
      regExStr,
      map: paramMap,

      // The more specific, the higher the weight
      weight: regExStr.length + paramCount - wildCards
    };
  }

});