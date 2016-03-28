import Molecule from 'moleculejs';
import Singleton from 'molecule-singleton';

const ROUTE_NAMESPACE = '__ROUTE_';

let _RouteClass = Molecule({
  initRoute() {},
  revisitRoute() {}
});

export default function Route(name, classDefinition) {
  let routeInstance = Singleton(`${ROUTE_NAMESPACE}${name}`, _RouteClass.extend(classDefinition));
  return function(params) {
    if (!routeInstance.__initialized) {
      try {
        routeInstance.initRoute(params);
        routeInstance.__initialized = true;
      } catch (exc) {
        throw `Unable to initialize route "${name}": ${exc.message}`;
      }
    } else {
      routeInstance.revisitRoute(params);
    }
  }
}