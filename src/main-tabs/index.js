/**
 * Tabs widget with multiple encoder instances.
 * @module boram/main-tabs
 */

import React from "react";
import {useSheet} from "../jss";
import {Tabs, Tab} from "../theme";
import Instance from "./instance";

const DEFAULT_LABEL = "untitled";
const KEY_0 = 48;
const KEY_9 = 57;

@useSheet({
  tab: {
    // XXX(Kagami): The only way to style tab header height.
    // See: <https://github.com/callemall/material-ui/issues/5391>.
    "& > div > div": {
      height: "40px !important",
    },
  },
})
export default class extends React.Component {
  static styles = {
    tabItem: {
      backgroundColor: "#bbb",
    },
    inkBar: {
      display: "none",
    },
    tabContent: {
      position: "fixed",
      left: 0,
      right: 0,
      top: 40,
      bottom: 0,
    },
  }
  state = {tabs: [], tabIndex: 0}
  componentWillMount() {
    this.addTab();
  }
  componentDidMount() {
    document.addEventListener("keydown", this.handleGlobaKey, false);
  }
  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleGlobaKey, false);
  }
  addTab() {
    const tabs = this.state.tabs;
    tabs.push({label: DEFAULT_LABEL});
    this.setState({tabs});
  }
  handleChange = (tabIndex) => {
    const tabs = this.state.tabs;
    if (tabIndex === "new_tab") {
      tabIndex = tabs.length;
      this.addTab();
      this.setState({tabIndex});
    } else {
      this.setState({tabIndex});
    }
  };
  handleTabTitle = (i, label = DEFAULT_LABEL) => {
    const tabs = this.state.tabs;
    tabs[i].label = label;
    this.setState({tabs});
  };
  handleGlobaKey = (e) => {
    if (e.keyCode >= KEY_0 && e.keyCode <= KEY_9 && e.altKey) {
      let tabIndex = e.keyCode - KEY_0;
      tabIndex = (tabIndex === 0 ? 10 : tabIndex) - 1;
      if (tabIndex < this.state.tabs.length &&
          tabIndex !== this.state.tabIndex) {
        this.setState({tabIndex});
      }
    }
  };
  render() {
    const {classes} = this.sheet;
    const styles = this.constructor.styles;
    return (
      <Tabs
        value={this.state.tabIndex}
        onChange={this.handleChange}
        tabItemContainerStyle={styles.tabItem}
        inkBarStyle={styles.inkBar}
        tabTemplateStyle={styles.tabContent}
      >
      {this.state.tabs.map((tab, i) =>
        <Tab
          key={i}
          value={i}
          label={tab.label}
          className={classes.tab}
        >
          <Instance
            active={this.state.tabIndex === i}
            onTabTitle={this.handleTabTitle.bind(null, i)}
          />
        </Tab>
      )}
        <Tab
            label="new tab"
            value="new_tab"
            className={classes.tab}
        />
      </Tabs>
    );
  }
}
