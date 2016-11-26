/**
 * Codecs tab.
 * @module boram/encoder/codecs
 */

import React from "react";
import {useSheet} from "../jss";
import {
  MenuItem,
  Prop,
  SmallSelect, SmallInput,
  InlineCheckbox,
  ArgsInput,
  Sep,
} from "../theme";

@useSheet({
  outer: {
    height: "100%",
  },
  name: {
    lineHeight: "48px",
  },
  nameArgs: {
    lineHeight: "48px",
    verticalAlign: "top",
    width: "15%",
  },
  valueArgs: {
    width: "85%",
    maxWidth: "none",
  },
})
export default class extends React.PureComponent {
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.outer}>
        <div style={{width: "50%"}}>
          <Prop name="fragment" nameClassName={classes.name}>
            <SmallInput
              ref="start"
              width={75}
              hintText="start"
              onBlur={this.props.onUpdate}
            />
            <Sep>÷</Sep>
            <SmallInput
              ref="end"
              hintText="end"
              width={75}
              onBlur={this.props.onUpdate}
            />
          </Prop>
          <Prop name="video codec" nameClassName={classes.name}>
            <SmallSelect
              width={75}
              value={this.props.vcodec}
              onChange={this.props.makeSelecter("vcodec")}
            >
              <MenuItem value="vp9" primaryText="vp9" />
              <MenuItem value="vp8" primaryText="vp8" />
            </SmallSelect>
            <Sep/>
            <SmallInput
              ref="limit"
              hintText={this.props.modeLimit ? "limit" : "bitrate"}
              disabled={this.props.modeCRF}
              onBlur={this.props.onUpdate}
            />
            <Sep/>
            <SmallInput
              ref="crf"
              hintText="quality"
              onBlur={this.props.onUpdate}
            />
          </Prop>
          <Prop name="audio codec" nameClassName={classes.name}>
            <SmallSelect
              width={75}
              value={this.props.acodec}
              disabled={!this.props.hasAudio}
              onChange={this.props.makeSelecter("acodec")}
            >
              <MenuItem primaryText="opus" value="opus" />
              <MenuItem primaryText="vorbis" value="vorbis" />
            </SmallSelect>
            <Sep/>
            <SmallInput
              ref="ab"
              hintText={this.props.acodec === "opus" ? "bitrate" : "quality"}
              disabled={!this.props.hasAudio}
              onBlur={this.props.onUpdate}
            />
          </Prop>
          <Prop name="mode" nameClassName={classes.name}>
            <InlineCheckbox
              label="2pass"
              title="Use 2pass encode (recommended)"
              checked={this.props.mode2Pass}
              onCheck={this.props.makeChecker("mode2Pass")}
            />
            <Sep/>
            <InlineCheckbox
              label="limit"
              title="Toggle fit-to-limit/custom-bitrate modes"
              checked={this.props.modeLimit}
              disabled={this.props.modeCRF}
              onCheck={this.props.makeChecker("modeLimit")}
            />
            <Sep/>
            <InlineCheckbox
              label="crf"
              title="Use CRF mode (recommended for short clips)"
              checked={this.props.modeCRF}
              onCheck={this.props.makeChecker("modeCRF")}
            />
          </Prop>
        </div>
        <Prop
          name="raw args"
          nameClassName={classes.nameArgs}
          valueClassName={classes.valueArgs}
        >
          <ArgsInput
            ref="rawArgs"
            onChange={this.props.onRawArgs}
          />
        </Prop>
      </div>
    );
  }
}
