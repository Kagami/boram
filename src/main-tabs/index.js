/**
 * Tabs widget with multiple encoder instances.
 * @module boram/main-tabs
 */

import {basename} from "path";
import {remote} from "electron";
import React from "react";
import cx from "classnames";
import {ICON_BIG_PATH} from "../shared";
import {useSheet} from "../jss";
import ShowHide from "../show-hide";
import {Tabs, Tab, Icon} from "../theme";
import {showProgress} from "../util";
import Instance from "./instance";

const DEFAULT_LABEL = "untitled";

@useSheet({
  tab: {
    flex: 1,
    lineHeight: "40px",
    color: "#fff !important",
    backgroundColor: "#bbb !important",
    cursor: "auto !important",
    WebkitUserSelect: "none",
    // TODO(Kagami): The only way to style tab header height. See:
    // <https://github.com/callemall/material-ui/issues/5391>.
    // Report that.
    "& > div": {
      height: "40px !important",
    },
  },
  newTab: {
    extend: "tab",
    flex: "0 60px",
  },
  activeTab: {
    color: "#999 !important",
    backgroundColor: "#eee !important",
  },
  tabItem: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
  },
  label: {
    flex: 1,
    padding: "0 5px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  icon: {
    fontSize: "30px",
    lineHeight: "40px",
    marginTop: -2,
    marginRight: 5,
    cursor: "pointer",
  },
  iconNew: {
    fontSize: "30px",
    width: 60,
    lineHeight: "40px",
    cursor: "pointer",
  },
  tabContent: {
    position: "fixed",
    left: 0,
    right: 0,
    top: 40,
    bottom: 0,
  },
})
export default class extends React.Component {
  // NOTE(Kagami): This component is _not_ pure.
  state = {tabs: [], tabIndex: 0};
  componentWillMount() {
    this.addTab();
  }
  componentDidMount() {
    window.addEventListener("beforeunload", this.handleGlobalClose, false);
  }
  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.handleGlobalClose, false);
    this.abort();
  }
  closing = false;
  tabKey = 0;
  getInstance(i) {
    return this.refs[`instance${i}`];
  }
  addTab(opts) {
    const tabs = this.state.tabs;
    tabs.push({
      key: this.tabKey++,
      label: DEFAULT_LABEL,
      progress: 0,
      source: null,
      ...opts,
    });
    this.setState({tabs});
  }
  handleGlobalClose = (e) => {
    if (!BORAM_DEBUG && !this.closing) {
      e.returnValue = false;
      setTimeout(() => {
        const choice = remote.dialog.showMessageBox({
          // Normally dialogs in win build should use .ico icon too, but
          // for some reason it looks much worse than png, even with
          // multiple dimensions included.
          icon: ICON_BIG_PATH,
          title: "Confirm",
          message: "Close all tabs and quit?",
          buttons: ["OK", "Cancel"],
        });
        if (choice === 0) {
          // Workaround for:
          // <https://github.com/electron/electron/issues/7977>.
          this.closing = true;
          remote.getCurrentWindow().close();
        }
      });
    } else {
      this.abort();
    }
  };
  abort() {
    for (let i = 0; i < this.state.tabs.length; i++) {
      this.getInstance(i).abort();
    }
  }
  handleTitleChange = (i, label = DEFAULT_LABEL) => {
    const tabs = this.state.tabs;
    tabs[i].label = label;
    this.setState({tabs});
  };
  handleProgressChange = (i, progress = 0) => {
    const tabs = this.state.tabs;
    tabs[i].progress = progress;
    this.setState({tabs});
  };
  handleSelect = (tabIndex) => {
    this.setState({tabIndex});
  };
  handleNew = (e, opts) => {
    if (e) e.stopPropagation();
    this.addTab(opts);
    const tabIndex = this.state.tabs.length - 1;
    this.setState({tabIndex});
  };
  handleSourceUpdate = (i, source) => {
    const tabs = this.state.tabs;
    tabs[i].source = source;
    this.setState({tabs});
  };
  handleClone = (i, e) => {
    e.stopPropagation();
    const {source} = this.state.tabs[i];
    const label = basename(source.path);
    this.handleNew(null, {label, source});
  };
  handleClose = (i, e) => {
    e.stopPropagation();
    const choice = remote.dialog.showMessageBox({
      icon: ICON_BIG_PATH,
      title: "Confirm",
      message: "Close tab?",
      buttons: ["OK", "Cancel"],
    });
    if (choice !== 0) return;
    this.getInstance(i).abort();
    const tabs = this.state.tabs;
    tabs.splice(i, 1);
    let tabIndex = this.state.tabIndex;
    tabIndex = Math.min(tabIndex, tabs.length - 1);
    tabIndex = Math.max(0, tabIndex);
    this.setState({tabs, tabIndex});
    if (!this.state.tabs.length) {
      this.addTab();
    }
  };
  getLabelNode(i) {
    const {classes} = this.sheet;
    const {label, progress, source} = this.state.tabs[i];
    const title = progress > 0 && progress < 100
      ? `[${showProgress(progress)}] ${label}`
      : label;
    return (
      <div className={classes.tabItem}>
        <div className={classes.label} title={title}>
          {title}
        </div>
        <ShowHide show={!!source}>
          <Icon
            name="copy"
            title="Clone tab"
            className={classes.icon}
            onTouchTap={this.handleClone.bind(null, i)}
          />
        </ShowHide>
        <Icon
          name="close"
          title="Close tab"
          className={classes.icon}
          onTouchTap={this.handleClose.bind(null, i)}
        />
      </div>
    );
  }
  getLabelNewNode() {
    const {classes} = this.sheet;
    return (
      <Icon
        name="plus"
        title="New tab"
        className={classes.iconNew}
        onTouchTap={this.handleNew}
      />
    );
  }
  render() {
    const {classes} = this.sheet;
    return (
      <Tabs
        value={this.state.tabIndex}
        onChange={this.handleSelect}
        inkBarStyle={{display: "none"}}
        tabTemplateStyle={{height: "100%"}}
        contentContainerClassName={classes.tabContent}
      >
      {this.state.tabs.map((tab, i) =>
        <Tab
          key={tab.key}
          tabKey={tab.key}
          value={i}
          label={this.getLabelNode(i)}
          className={cx(classes.tab,
                        this.state.tabIndex === i && classes.activeTab)}
          disableTouchRipple
        >
          <Instance
            ref={`instance${i}`}
            source={tab.source}
            active={this.state.tabIndex === i}
            onTabTitle={this.handleTitleChange.bind(null, i)}
            onProgress={this.handleProgressChange.bind(null, i)}
            onSourceUpdate={this.handleSourceUpdate.bind(null, i)}
          />
        </Tab>
      )}
        <Tab
          tabKey={-1}
          value={-1}
          label={this.getLabelNewNode()}
          className={classes.newTab}
          disableTouchRipple
        />
      </Tabs>
    );
  }
}
