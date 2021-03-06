// @flow

import React from 'react';
import onClickOutside from 'react-onclickoutside';

import Draggable, { type DraggableEventHandler, type DraggableData } from 'react-draggable';

import NodeInputList from './NodeInputList';
import NodeOutputList from './NodeOutputList';
import type { AnyNode } from 'models/NodeBase';
import type { NodeInSpace, Pos } from 'types';
import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';
import { throttle, get } from 'lodash';

type P = {
  index: number,
  nis: NodeInSpace,
  pos: Pos,
  inView: boolean,
  onNodeStart: (NodeInSpace, DraggableData) => void,
  onNodeStop: (NodeInSpace, DraggableData) => void,
  onNodeMove: (NodeInSpace, DraggableData) => void,
  onStartConnector: (string, number) => void,
  onCompleteConnector: (string, number) => void,
  onNodeSelect?: NodeInSpace => void,
  onNodeDeselect?: (NodeInSpace, boolean) => void,
  onDelete?: AnyNode => void,
  visible: boolean,
  selected: boolean,
};
type S = { clickOutsideEnabled: boolean };
const MoveBufferPx = 4;

class Node extends React.Component<P, S> {
  dragStart: ?Pos;
  dragging: boolean = false;
  dragData: ?DraggableData = null;

  constructor(props) {
    super(props);
    this.state = { clickOutsideEnabled: true };
  }

  _onDelete = () => {
    this.props.onDelete && this.props.onDelete(this.props.nis.node);
  };

  handleDragStart = (event, data: DraggableData) => {
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.props.onNodeStart(this.props.nis, data);
    this.dragging = true;
  };

  handleDragStop: DraggableEventHandler = (event, data: DraggableData) => {
    this.props.onNodeStop(this.props.nis, data);
    this.props.nis.pos = { x: data.x, y: data.y };
    this.dragging = false;
    this.dragData = null;
    setTimeout(() => {
      this.dragStart = null;
    });
  };

  handleDrag = throttle((event, data: DraggableData) => {
    this.props.onNodeMove(this.props.nis, data);
    this.props.nis.pos = { x: data.x, y: data.y };
    this.dragData = data;
  }, 30);

  onStartConnector = index => {
    this.props.onStartConnector(this.props.nis.node.id, index);
  };

  onCompleteConnector = index => {
    this.props.onCompleteConnector(this.props.nis.node.id, index);
    this.forceUpdate();
  };

  _selectNode = () => {
    if (this.props.onNodeSelect) {
      this.props.onNodeSelect(this.props.nis);
    }
  };

  _deselectNode = () => {
    if (this.props.onNodeDeselect) {
      this.props.onNodeDeselect(this.props.nis, false);
    }
  };

  handleClick = () => {
    const x = get(this.dragStart, 'x');
    const y = get(this.dragStart, 'y');
    const wx = get(window, 'event.clientX');
    const wy = get(window, 'event.clientY');
    if (
      x &&
      y &&
      wx &&
      wy &&
      (Math.abs(wx - x) > MoveBufferPx || Math.abs(wy - y) > MoveBufferPx)
    ) {
      return;
    }
    if (!this.props.selected) {
      this._selectNode();
    } else {
      this._deselectNode();
    }
  };

  // noinspection JSUnusedGlobalSymbols
  handleClickOutside = event => {
    const { selected, inView } = this.props;
    const ignore = !selected && !inView;
    if (event.metaKey || event.shiftKey || ignore) {
      return;
    }
    if (this.props.onNodeDeselect) {
      this.props.onNodeDeselect(this.props.nis, true);
    }
  };

  render() {
    const { selected, inView, visible, pos } = this.props;
    const { node } = this.props.nis;
    const sel = inView ? 'in-view' : selected ? 'selected' : '';
    let nodeClass = 'node-container node' + (sel ? ` ${sel} ignore-react-onclickoutside` : '');
    if (!visible) {
      return null;
    }

    const name = node.name();
    return (
      <div onClick={this.handleClick} onDoubleClick={this._selectNode}>
        <Draggable
          defaultPosition={pos}
          position={this.dragging ? undefined : pos}
          handle=".node-container"
          onStart={this.handleDragStart}
          onStop={this.handleDragStop}
          onDrag={this.handleDrag}>
          <div className={nodeClass} style={{ zIndex: 11 }}>
            <header className="node-header">
              <span className="node-title">{name}</span>
            </header>
            <div className="node-content">
              <NodeInputList
                connected={node.connectedInputKeys()}
                items={node.inKeys()}
                onCompleteConnector={this.onCompleteConnector}
              />
              <NodeOutputList
                connected={node.connectedOutputKeys()}
                items={node.outKeys()}
                onStartConnector={this.onStartConnector}
              />
            </div>
          </div>
        </Draggable>
      </div>
    );
  }

  // noinspection JSUnusedGlobalSymbols
  renderHotkeys() {
    const show = this.props.selected || this.props.inView;
    if (!show) {
      return <Hotkeys />;
    }
    return (
      <Hotkeys>
        <Hotkey
          group="Node Actions"
          combo="backspace"
          label="Delete selected node"
          global={true}
          onKeyDown={this._onDelete}
        />
      </Hotkeys>
    );
  }
}

export default onClickOutside(HotkeysTarget(Node));
