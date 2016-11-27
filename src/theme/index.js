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

function makeProp(nameStyles) {
  const styles = {
    name: {
      display: "inline-block",
      width: "30%",
      lineHeight: "48px",
      verticalAlign: "middle",
      cursor: "default",
      WebkitUserSelect: "none",
      "&:first-letter": {
        textTransform: "capitalize",
      },
      ...nameStyles,
    },
    value: {
      display: "inline-block",
      color: SECONDARY_COLOR,
      maxWidth: "65%",
      overflow: "hidden",
      verticalAlign: "middle",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  };
  return useSheet(styles)(function(props, {classes}) {
    return (
      <div>
        <div className={cx(classes.name, props.nameClassName)}>
          {props.name}:
        </div>
        <div className={cx(classes.value, props.valueClassName)}>
          {props.children}
        </div>
      </div>
    );
  });
}

export const Prop = makeProp();
export const CompactProp = makeProp({lineHeight: "inherit"});

export class SmallInput extends React.PureComponent {
  static styles = {
    outer: {
      margin: 0,
      textAlign: "center",
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
  };
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
    this.refs.input.input.setValue(value);
  }
  handleKeyDown = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  };
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
      overflow: "hidden",
    },
    item: {
      color: SECONDARY_COLOR,
    },
  };
  return function(props) {
    const {style, width, ...other} = props;
    const mainStyle = Object.assign(
      {},
      styles.select,
      {width: width || 140},
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

export const InlineCheckbox = (function() {
  const styles = {
    checkbox: {
      display: "inline-block",
      width: "auto",
      verticalAlign: "middle",
    },
    icon: {
      marginRight: COMMON_MARGIN,
    },
  };
  function handleKeyDown(e) {
    e.preventDefault();
  }
  return function(props) {
    return (
      <Checkbox
        {...props}
        style={styles.checkbox}
        iconStyle={styles.icon}
        onKeyDown={handleKeyDown}
      />
    );
  };
})();

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
      backgroundColor: "#bbb",
      color: "#fff",
    },
    label: {
      fontSize: "inherit",
      textTransform: "none",
    },
  };
  function handleKeyDown(e) {
    e.preventDefault();
  }
  return function(props) {
    const {style, ...other} = props;
    const mainStyle = Object.assign({}, styles.buttonOuter, style);
    return (
      <RaisedButton
        {...other}
        secondary
        style={mainStyle}
        buttonStyle={styles.button}
        labelStyle={styles.label}
        onKeyDown={handleKeyDown}
      />
    );
  };
})();

export const BigButton = (function() {
  const styles = {
    buttonOuter: {
      minWidth: 40,
    },
    button: {
      backgroundColor: "#bbb",
      color: "#fff",
      borderRadius: 0,
    },
    overlay: {
      borderRadius: 0,
    },
  };
  function handleKeyDown(e) {
    e.preventDefault();
  }
  return function(props) {
    const {style, width, height, ...other} = props;
    const mainStyle = Object.assign({
      width: width || "auto",
      height: height || 30,
    }, styles.buttonOuter, style);
    const buttonStyle = Object.assign({
      height: height || 30,
    }, styles.button);
    return (
      <RaisedButton
        {...other}
        secondary
        style={mainStyle}
        buttonStyle={buttonStyle}
        overlayStyle={styles.overlay}
        onKeyDown={handleKeyDown}
      />
    );
  };
})();

export function BigProgress(props) {
  return (
    <LinearProgress
      {...props}
      mode="determinate"
      style={{height: 30, borderRadius: 0, backgroundColor: "#ccc"}}
    />
  );
}

export function BoldIcon(props) {
  return (
    <Icon {...props} style={{fontWeight: "bold"}} />
  );
}

export function Sep(props) {
  const display = props.vertical ? "block" : "inline-block";
  const margin = props.vertical ? `${props.margin || 5}px 0`
                                : `0 ${props.margin || 5}px`;
  const style = {
    display,
    margin,
    textAlign: "center",
    [props.vertical ? "height" : "width"]: props.size || "auto",
  };
  return (
    <div style={style}>{props.children}</div>
  );
}

export const Tip = (function() {
  const styles = {
    tip: {
      position: "fixed",
      left: 50,
      right: 50,
      bottom: 30,
      padding: 10,
      color: "#333",
      backgroundColor: BACKGROUND_COLOR,
    },
    icon: {
      display: "inline-block",
      marginRight: 15,
      color: "blue",
    },
  };
  return function(props) {
    return (
      <Paper style={styles.tip}>
        <Icon name={props.icon} style={styles.icon} />
        {props.children}
      </Paper>
    );
  };
})();

export const HelpPane = useSheet({
  outer: {
    display: "flex",
    height: "100%",
  },
  first: {
    width: "50%",
    height: "100%",
  },
  second: {
    borderLeft: "2px solid #ccc",
    flex: 1,
    height: "100%",
    padding: "0 10px",
    overflowY: "auto",
  },
  title: {
    margin: 0,
    marginBottom: 10,
  },
  description: {
    fontSize: "16px",
  },
})(function(props, {classes}) {
  const {help, focused, errors} = props;
  const showHelp = !!(focused && help[focused]);
  const showErrors = !!errors.length;
  const show = showHelp || showErrors;
  const style = {display: show ? "block" : "none"};

  function getHelpNode() {
    const [title, description] = help[focused];
    return (
      <div>
        <h3 className={classes.title}>{title}</h3>
        <span className={classes.description}>{description}</span>
      </div>
    );
  }

  return (
    <div className={classes.outer}>
      <div className={classes.first}>
        {props.children}
      </div>
      <div className={classes.second} style={style}>
        {showHelp ? getHelpNode() : null}
      </div>
    </div>
  );
});
