/**
 * Audio effects tab.
 * @module boram/encoder/audio-fx
 */

import React from "react";
import {
  HelpPane,
  Prop, SmallInput,
  SmallSelect, MenuItem,
  InlineCheckbox, Sep,
} from "../theme";
import {showLang} from "../util";

const HELP = {
  fadeIn: [
    "Fade-in",
    `Fade-in effect, in seconds. "1" is good value.`,
  ], fadeOut: [
    "Fade-out",
    `Fade-out effect, in seconds. "1" is good value.`,
  ], amplify: [
    "Amplify",
    `Compress and amplify quiet audio. Allowed range: 1÷64.
     2÷4 are good values.`,
  ],
};

export default class extends React.PureComponent {
  getAudioText(track, i) {
    const lang = showLang(track);
    return `#${i} (${track.codec_name}${lang ? ", " + lang : ""})`;
  }
  render() {
    return (
      <HelpPane
        help={HELP}
        focused={this.props.focused}
        errors={this.props.errors}
      >
        <Prop name="audio track">
          <InlineCheckbox
            checked={this.props.hasAudio}
            disabled={!this.props.atracks.length}
            onCheck={this.props.makeChecker("hasAudio")}
          />
          <SmallSelect
            hintText="no audio"
            value={this.props.atrackn}
            disabled={!this.props.hasAudio}
            onChange={this.props.makeSelecter("atrackn")}
          >
          {this.props.atracks.map((t, i) =>
            <MenuItem
              key={i}
              value={i}
              primaryText={this.getAudioText(t, i)}
            />
          )}
          </SmallSelect>
        </Prop>
        <Prop name="fade">
          <SmallInput
            ref="fadeIn"
            hintText="in"
            disabled={!this.props.hasAudio}
            onFocus={this.props.makeFocuser("fadeIn")}
            onBlur={this.props.onUpdate}
          />
          <Sep/>
          <SmallInput
            ref="fadeOut"
            hintText="out"
            disabled={!this.props.hasAudio}
            onFocus={this.props.makeFocuser("fadeOut")}
            onBlur={this.props.onUpdate}
          />
        </Prop>
        <Prop name="amplify">
          <SmallInput
            ref="amplify"
            hintText="factor"
            disabled={!this.props.hasAudio}
            onFocus={this.props.makeFocuser("amplify")}
            onBlur={this.props.onUpdate}
          />
        </Prop>
      </HelpPane>
    );
  }
}
