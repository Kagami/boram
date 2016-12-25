/**
 * JSS-related routines.
 * @module boram/jss
 */

// Same as in jss.
import createHash from "murmurhash-js/murmurhash3_gc";
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
 * Similar to `useSheet` from react-jss but doesn't create wrapper
 * component and attaches styles immediately.
 * Note that API of this decorator is slightly different.
 */
export function useSheet(styles, opts = {}) {
  // Fuck JSS. So great idea to generate exactly same hash for the same
  // prefix and content.
  // Provide hash to avoid huge "data-meta" values.
  opts.meta = createHash(JSON.stringify(styles));
  const sheet = jss.createStyleSheet(styles, opts).attach();
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
