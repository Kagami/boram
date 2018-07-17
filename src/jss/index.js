/**
 * JSS-related routines.
 * @module boram/jss
 */

import jss from "jss";
import global from "jss-global";
import extend from "jss-extend";
import nested from "jss-nested";
import camelCase from "jss-camel-case";
import defaultUnit from "jss-default-unit";

// Plugins used across application.
jss.use(global(), extend(), nested(), camelCase(), defaultUnit());

/** Application components should use that reexport. */
export {jss};
export default jss;

/**
 * Similar to `injectSheet` from react-jss but don't create wrapper
 * component and attach styles immediately.
 *
 * Note that API of this decorator is slightly different.
 */
export function useSheet(styles) {
  const sheet = jss.createStyleSheet(styles).attach();
  return function(target) {
    // Normal component.
    if (target.prototype.render) {
      target.prototype.sheet = sheet;
      return target;
    // Stateless component.
    } else {
      return function(props) {
        return target(props, sheet);
      };
    }
  };
}
