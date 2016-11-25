/**
 * Video effects tab.
 * @module boram/encoder/video-fx
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
      <div style={{width: "50%"}}>
        <Prop name="video track" nameClassName={classes.prop}>
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
        <Prop name="deinterlace" nameClassName={classes.prop}>
          <InlineCheckbox
            checked={this.props.deinterlace}
            onCheck={this.props.makeChecker("deinterlace")}
          />
          {/*<SmallButton
            label="detect"
            style={{marginLeft: 0}}
            />*/}
        </Prop>
        <Prop name="scale" nameClassName={classes.prop}>
          <SmallInput
            ref="scalew"
            hintText="width"
            onBlur={this.props.onUpdate}
          />
          <Sep size={10}>×</Sep>
          <SmallInput
            ref="scaleh"
            hintText="height"
            onBlur={this.props.onUpdate}
          />
        </Prop>
        <Prop name="crop" nameClassName={classes.prop}>
          <SmallInput
            ref="cropw"
            hintText="width"
            onBlur={this.props.onUpdate}
          />
          <Sep size={10}>:</Sep>
          <SmallInput
            ref="croph"
            hintText="height"
            onBlur={this.props.onUpdate}
          />
          <Sep size={10}>:</Sep>
          <SmallInput
            ref="cropx"
            hintText="left"
            onBlur={this.props.onUpdate}
          />
          <Sep size={10}>:</Sep>
          <SmallInput
            ref="cropy"
            hintText="top"
            onBlur={this.props.onUpdate}
          />
          {/*<SmallButton
            label="detect"
          />*/}
        </Prop>
        {/*<Prop name="speed" nameClassName={classes.prop}>
          <SmallInput
            ref="speed"
            hintText="factor"
            onBlur={this.props.onUpdate}
          />
          <Sep margin={10} />
          <SmallInput
            ref="fps"
            hintText="fps"
            onBlur={this.props.onUpdate}
          />
        </Prop>*/}
        <Prop name="burn subs" nameClassName={classes.prop}>
          <InlineCheckbox
            checked={this.props.burnSubs}
            disabled={!this.props.stracks.length}
            onCheck={this.props.makeChecker("burnSubs")}
          />
          <SmallSelect
            hintText="no subs"
            value={this.props.strackn}
            disabled={!this.props.stracks.length}
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
      </div>
    );
  }
}
