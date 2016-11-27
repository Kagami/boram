/**
 * Video effects tab.
 * @module boram/encoder/video-fx
 */

import React from "react";
import {
  HelpPane,
  Prop, SmallInput,
  SmallSelect, MenuItem,
  InlineCheckbox, Sep,
  // SmallButton, BoldIcon,
} from "../theme";

const HELP = {
  cropw: [
    "Crop width",
    `Crop area width.`,
  ], croph: [
    "Crop height",
    `Crop area height.`,
  ], cropx: [
    "Crop left",
    `Horizontal position in the input video. Centered by default.`,
  ], cropy: [
    "Crop top",
    `Vertical position in the input video. Centered by default.`,
  ], scalew: [
    "Output width",
    `Specifies width of the resulting video.
     If height is empty, it will be calculated automatically,
     keeping the aspect ratio.

     Make sure to specify both fields for anamorphic video.`,
  ], scaleh: [
    "Output height",
    `Specifies height of the resulting video.
     If width is empty, it will be calculated automatically,
     keeping the aspect ratio.

     Make sure to specify both fields for anamorphic video.`,
  ],
};

// Can't use stateless component because of refs.
export default class extends React.PureComponent {
  render() {
    return (
      <HelpPane
        help={HELP}
        focused={this.props.focused}
        errors={this.props.errors}
      >
        <Prop name="video track">
          <SmallSelect
            value={this.props.vtrackn}
            onChange={this.props.makeSelecter("vtrackn")}
          >
          {this.props.vtracks.map((t, i) =>
            <MenuItem
              key={i}
              value={i}
              primaryText={`#${i} (${t.width}x${t.height})`}
            />
          )}
          </SmallSelect>
        </Prop>
        <Prop name="deinterlace">
          <InlineCheckbox
            title="Toggle deinterlacing filter"
            checked={this.props.deinterlace}
            onCheck={this.props.makeChecker("deinterlace")}
          />
          {/*<SmallButton
            label="detect"
            style={{marginLeft: 0}}
            />*/}
        </Prop>
        <Prop name="crop">
          <SmallInput
            ref="cropw"
            hintText="width"
            onFocus={this.props.makeFocuser("cropw")}
            onBlur={this.props.onUpdate}
          />
          <Sep size={10}>:</Sep>
          <SmallInput
            ref="croph"
            hintText="height"
            onFocus={this.props.makeFocuser("croph")}
            onBlur={this.props.onUpdate}
          />
          <Sep size={10}>:</Sep>
          <SmallInput
            ref="cropx"
            hintText="left"
            onFocus={this.props.makeFocuser("cropx")}
            onBlur={this.props.onUpdate}
          />
          <Sep size={10}>:</Sep>
          <SmallInput
            ref="cropy"
            hintText="top"
            onFocus={this.props.makeFocuser("cropy")}
            onBlur={this.props.onUpdate}
          />
          {/*<SmallButton
            label="detect"
          />*/}
        </Prop>
        <Prop name="scale">
          <SmallInput
            ref="scalew"
            hintText="width"
            onFocus={this.props.makeFocuser("scalew")}
            onBlur={this.props.onUpdate}
          />
          <Sep size={10}>×</Sep>
          <SmallInput
            ref="scaleh"
            hintText="height"
            onFocus={this.props.makeFocuser("scaleh")}
            onBlur={this.props.onUpdate}
          />
        </Prop>
        {/*<Prop name="speed">
          <SmallInput
            ref="speed"
            hintText="factor"
            onFocus={this.props.makeFocuser("speed")}
            onBlur={this.props.onUpdate}
          />
          <Sep margin={10} />
          <SmallInput
            ref="fps"
            hintText="fps"
            onFocus={this.props.makeFocuser("fps")}
            onBlur={this.props.onUpdate}
          />
        </Prop>*/}
        <Prop name="burn subs">
          <InlineCheckbox
            checked={this.props.burnSubs}
            disabled={!this.props.stracks.length}
            onCheck={this.props.makeChecker("burnSubs")}
          />
          <SmallSelect
            hintText="no subs"
            value={this.props.strackn}
            disabled={!this.props.burnSubs}
            onChange={this.props.makeSelecter("strackn")}
          >
          {this.props.stracks.map((t, i) =>
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
      </HelpPane>
    );
  }
}
