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
export {Icon};
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
    prop: {
      display: "flex",
    },
    name: {
      width: 130,
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
      boxSizing: "border-box",
      flex: 1,
      paddingRight: 5,
      overflow: "hidden",
      verticalAlign: "middle",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      color: SECONDARY_COLOR,
    },
  };
  return useSheet(styles)(function(props, {classes}) {
    return (
      <div className={classes.prop}>
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
  };
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
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const v = this.getValue() || "0";
      if (v.match(/^\d+$/)) {
        this.setValue(parseInt(v, 10) + (e.key === "ArrowUp" ? 1 : -1));
      }
    }
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
    menu: {
      color: SECONDARY_COLOR,
    },
    label: {
      paddingRight: 24,
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
        menuStyle={styles.menu}
        labelStyle={styles.label}
      >
        {props.children}
      </SelectField>
    );
  };
})();

export const InlineCheckbox = (function() {
  const styles = {
    checkbox: {
      display: "inline-block",
      width: "auto",
      verticalAlign: "middle",
      // Adjust for displaced svg icon.
      marginLeft: -3,
    },
    icon: {
      marginRight: 10,
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
      lineHeight: "26px",
    },
    button: {
      height: 26,
      lineHeight: "26px",
      backgroundColor: "#bbb",
      color: "#fff",
    },
    buttonDisabled: {
      backgroundColor: "#ddd",
      cursor: "not-allowed",
    },
    label: {
      fontSize: "inherit",
      textTransform: "none",
    },
    overlay: {
      height: 26,
    },
  };
  function handleKeyDown(e) {
    e.preventDefault();
  }
  return function(props) {
    const {style, ...other} = props;
    const mainStyle = Object.assign({}, styles.buttonOuter, style);
    const buttonStyle = Object.assign(
      {}, styles.button,
      other.disabled && styles.buttonDisabled
    );
    return (
      <RaisedButton
        {...other}
        secondary
        style={mainStyle}
        buttonStyle={buttonStyle}
        labelStyle={styles.label}
        overlayStyle={styles.overlay}
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
    buttonDisabled: {
      backgroundColor: "#ddd",
      cursor: "not-allowed",
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
    }, styles.button, other.disabled && styles.buttonDisabled);
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

export function Sep(props) {
  const display = props.vertical ? "block" : "inline-block";
  const margin = props.vertical ? `${props.margin || 5}px 0`
                                : `0 ${props.margin || 5}px`;
  const style = {
    ...props.style,
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
      color: "#4078c0",
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
    flex: 1,
  },
  first: {
    width: "50%",
    minWidth: 400,
    height: "100%",
  },
  second: {
    flex: 1,
    height: "100%",
    overflowY: "auto",
  },
  secondInner: {
    height: "100%",
    paddingLeft: 10,
    borderLeft: "2px solid #ccc",
  },
  title: {
    margin: 0,
    marginBottom: 10,
  },
  description: {
    fontSize: "16px",
  },
  list: {
    margin: 0,
    fontSize: "16px",
    paddingLeft: 30,
  },
  warnings: {
    color: "orange",
  },
  errors: {
    color: "red",
  },
})(function(props, {classes}) {
  const {help, focused, warnings, errors} = props;
  const showHelp = !!(focused && help[focused]);
  const showErrors = !!(errors && errors.length);
  const showWarnings = !!(warnings && warnings.length);
  const show = showHelp || showWarnings || showErrors;
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

  function getWarningNode() {
    const marginTop = showHelp ? 10 : 0;
    return (
      <div style={{marginTop}}>
        <h3 className={classes.title}>Warnings</h3>
        <ul className={cx(classes.list, classes.warnings)}>
        {warnings.map((message, i) =>
          <li key={i}>{message}</li>
        )}
        </ul>
      </div>
    );
  }

  function getErrorNode() {
    const marginTop = (showHelp || showWarnings) ? 10 : 0;
    return (
      <div style={{marginTop}}>
        <h3 className={classes.title}>Errors</h3>
        <ul className={cx(classes.list, classes.errors)}>
        {errors.map(({name, message}) =>
          <li key={name}>{help[name][0]}: {message}</li>
        )}
        </ul>
      </div>
    );
  }

  return (
    <div className={classes.outer}>
      <div className={classes.first}>
        {props.children}
      </div>
      <div className={classes.second}>
        <div className={classes.secondInner} style={style}>
          {showHelp ? getHelpNode() : null}
          {showWarnings ? getWarningNode() : null}
          {showErrors ? getErrorNode() : null}
        </div>
      </div>
    </div>
  );
});
