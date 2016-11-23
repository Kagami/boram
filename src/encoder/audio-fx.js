/**
 * Audio effects tab.
 * @module boram/encoder/audio-fx
 */

import React from "react";
import {useSheet} from "../jss";
import {
  MenuItem, Prop,
  SmallSelect, SmallInput,
  InlineCheckbox, Sep,
  // SmallButton, BoldIcon,
} from "../theme";

@useSheet({
  prop: {
    lineHeight: "48px",
  },
})
export default class extends React.PureComponent {
  render() {
    const {classes} = this.sheet;
    return (
      <div>
        <Prop name="audio track" nameClassName={classes.prop}>
          <InlineCheckbox
            checked={this.props.hasAudio}
            disabled={!this.props.atracks.length}
            onCheck={this.props.makeChecker("hasAudio")}
          />
          <SmallSelect
            hintText="no audio"
            value={this.props.atrackn}
            disabled={!this.props.atracks.length}
            onChange={this.props.makeSelecter("atrackn")}
          >
          {this.props.atracks.map((t, i) =>
            <MenuItem
              key={i}
              value={i}
              primaryText={`#${i} (${t.codec_name})`}
            />
          )}
          </SmallSelect>
          {/*<SmallButton
            icon={<BoldIcon name="folder-open-o" />}
            title="Load external subtitle"
          />*/}
        </Prop>
        <Prop name="fade" nameClassName={classes.prop}>
          <SmallInput
            ref="fadeIn"
            hintText="in"
            onBlur={this.props.onUpdate}
          />
          <Sep/>
          <SmallInput
            ref="fadeOut"
            hintText="out"
            onBlur={this.props.onUpdate}
          />
        </Prop>
        <Prop name="amplify" nameClassName={classes.prop}>
          <SmallInput
            ref="amplify"
            hintText="factor"
            onBlur={this.props.onUpdate}
          />
        </Prop>
      </div>
    );
  }
}
