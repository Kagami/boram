/**
 * Theme-related variables and components.
 * @module boram/theme
 */

import assert from "assert";
import React from "react";
import cx from "classnames";
import Icon from "react-fa";
import Paper from "material-ui/Paper";
import {Tabs, Tab} from "material-ui/Tabs";
import Checkbox from "material-ui/Checkbox";
import MenuItem from "material-ui/MenuItem";
import TextField from "material-ui/TextField";
import FlatButton from "material-ui/FlatButton";
import SelectField from "material-ui/SelectField";
import RaisedButton from "material-ui/RaisedButton";
import LinearProgress from "material-ui/LinearProgress";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import {useSheet} from "../jss";
// Reexport stuff.
export {Paper};
export {Tabs, Tab};
export {MenuItem};
export {TextField};
export {FlatButton};
export {LinearProgress};
export {MuiThemeProvider};

// Some theme constants.
export const BOX_WIDTH = 960;
export const BOX_HEIGHT = 540;
export const BACKGROUND_COLOR = "#eee";
export const SECONDARY_COLOR = "#999";
export const COMMON_MARGIN = 10;

export function Pane(props) {
  assert.equal(React.Children.count(props.children), 2);
  const items = React.Children.toArray(props.children);

  const style = Object.assign({
    display: "flex",
    flexDirection: props.vertical ? "column" : "row",
    height: props.vertical ? "100%" : "auto",
  }, props.style);

  const item1Style = Object.assign({
    [props.vertical ? "marginBottom" : "marginRight"]: props.space || 0,
  }, props.style1);

  const item2Style = Object.assign({
    [props.vertical ? "height" : "width"]: props.size2 || "auto",
    flex: props.size2 ? 0 : 1,
  }, props.style2);

  return (
    <div style={style}>
      <div style={item1Style}>{items[0]}</div>
      <div style={item2Style}>{items[1]}</div>
    </div>
  );
}

export const Prop = useSheet({
  prop: {
    // display: "flex",
  },
  name: {
    display: "inline-block",
    width: 150,
    minWidth: 150,
    verticalAlign: "middle",
    cursor: "default",
    WebkitUserSelect: "none",
    "&:first-letter": {
      textTransform: "capitalize",
    },
  },
  value: {
    display: "inline-block",
    color: SECONDARY_COLOR,
    // maxWidth: 350,
    overflow: "hidden",
    verticalAlign: "middle",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
})(function(props, {classes}) {
  return (
    <div className={cx(classes.prop, props.className)}>
      <div className={cx(classes.name, props.nameClassName)}>
        {props.name}:
      </div>
      <div className={cx(classes.value, props.valueClassName)}>
        {props.children}
      </div>
    </div>
  );
});

export class SmallInput extends React.PureComponent {
  static styles = {
    outer: {
      margin: 0,
      textAlign: "center",
      // verticalAlign: "middle",
    },
    hint: {
      width: "100%",
    },
    input: {
      textAlign: "center",
    },
  }
  getValue() {
    return this.refs.input.getValue();
  }
  setValue(value) {
    this.refs.input.getInputNode().value = value;
    // XXX(Kagami): Horrible hack to fix `hasValue` inside component.
    this.refs.input.handleInputChange({target: {value}});
  }
  handleKeyDown = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  }
  render() {
    const {styles} = this.constructor;
    const {style, ...other} = this.props;
    const outerStyle = Object.assign(
      {},
      styles.outer,
      {width: this.props.width || 50},
      style,
    );
    return (
      <TextField
        {...other}
        ref="input"
        style={outerStyle}
        hintStyle={styles.hint}
        inputStyle={styles.input}
        onKeyDown={this.handleKeyDown}
      />
    );
  }
}

export class ArgsInput extends React.PureComponent {
  getValue() {
    return this.refs.input.getValue();
  }
  setValue(value) {
    this.refs.input.getInputNode().value = value;
  }
  handleKeyDown = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  }
  render() {
    return (
      <TextField
        {...this.props}
        ref="input"
        name="args"
        fullWidth
        multiLine
        rows={3}
        rowsMax={3}
        onKeyDown={this.handleKeyDown}
      />
    );
  }
}

export const SmallSelect = (function() {
  const styles = {
    select: {
      verticalAlign: "middle",
    },
    item: {
      color: SECONDARY_COLOR,
    },
  };

  return function(props) {
    const {style, ...other} = props;
    const mainStyle = Object.assign(
      {},
      styles.select,
      {width: props.width || 140},
      style,
    );
    return (
      <SelectField
        {...other}
        style={mainStyle}
        menuStyle={styles.item}
      />
    );
  };
})();

export const InlineCheckbox = useSheet({
  checkbox: {
    display: "inline-block !important",
    width: "auto !important",
    verticalAlign: "middle",
  },
})(function() {
  const styles = {
    icon: {
      marginRight: COMMON_MARGIN,
    },
  };

  return function(props, {classes}) {
    return (
      <Checkbox
        {...props}
        className={classes.checkbox}
        iconStyle={styles.icon}
      />
    );
  };
}());

export const SmallButton = (function() {
  const styles = {
    buttonOuter: {
      margin: "0 10px",
      minWidth: 35,
      height: 26,
    },
    button: {
      height: 26,
      lineHeight: "26px",
      backgroundColor: "#bdbdbd",
      color: "#fff",
      // borderRadius: 0,
    },
    label: {
      fontSize: "inherit",
      textTransform: "none",
    },
  };

  return function(props) {
    const style = Object.assign({}, styles.buttonOuter, props.style);
    return (
      <RaisedButton
        {...props}
        secondary
        style={style}
        buttonStyle={styles.button}
        labelStyle={styles.label}
      />
    );
  };
})();

export const BigButton = (function() {
  const styles = {
    buttonOuter: {
      // margin: "0 10px",
      minWidth: 40,
      height: 30,
    },
    button: {
      height: 30,
      lineHeight: "30px",
      backgroundColor: "#bdbdbd",
      color: "#fff",
      borderRadius: 0,
    },
    label: {
      // fontSize: "inherit",
      // textTransform: "none",
    },
  };

  return function(props) {
    const style = Object.assign({
      width: props.width || "auto",
    }, styles.buttonOuter, props.style);
    return (
      <RaisedButton
        {...props}
        secondary
        style={style}
        buttonStyle={styles.button}
        labelStyle={styles.label}
      />
    );
  };
})();

export function BigProgress(props) {
  return (
    <LinearProgress
      {...props}
      mode="determinate"
      style={{height: 30, borderRadius: 0}}
    />
  );
}

export function BoldIcon(props) {
  return (
    <Icon {...props} style={{fontWeight: "bold"}} />
  );
}

export function Sep(props) {
  const style = {
    display: "inline-block",
    textAlign: "center",
    margin: `0 ${props.margin || 5}px`,
    width: props.width || "auto",
  };
  return (
    <div style={style}>{props.children}</div>
  );
}
