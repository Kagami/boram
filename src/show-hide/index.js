/**
 * Conditional display widget.
 */

import React from "react";

export default function(props) {
  if (props.viaCSS) {
    const style = props.show ? {} : {display: "none"};
    Object.assign(style, props.style);
    return <div style={style}>{props.children}</div>;
  } else {
    if (!props.show) return null;
    if (React.Children.count(props.children) > 1) {
      return <div {...props}>{props.children}</div>;
    } else {
      return props.children;
    }
  }
}
