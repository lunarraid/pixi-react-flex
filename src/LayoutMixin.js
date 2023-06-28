import mergeStyles from './mergeStyles';
import applyLayoutProperties from './applyLayoutProperties';
import { Config, Node } from 'typeflex';

const nodeConfig = Config.create();
nodeConfig.setPointScaleFactor(0);

const NO_STYLE = {};
const MAX_LAYOUT_ATTEMPTS = 3;

export default function LayoutMixin (BaseClass) {
  const result = class LayoutMixin extends BaseClass {

    constructor (...args) {
      super(...args);

      this._sortedChildren = null;

      this.anchorX = 0.5;
      this.anchorY = 0.5;
      this.offsetX = 0;
      this.offsetY = 0;

      this.layoutNode = Node.create(nodeConfig);
      this.onLayout = null;

      this.layoutCallbackViews = [];
      this.callbackCount = 0;
      this.layoutAttemptCount = 0;

      this.cachedLayout = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };

      this.layoutStyle = NO_STYLE;

      this._isMeasureFunctionSet = false;
      this.updateMeasureFunction(false);
    }

    addToCallbackPool (view) {
      this.layoutCallbackViews[this.callbackCount] = view;
      this.callbackCount++;
    }

    removeFromCallbackPool (view) {
      const views = this.layoutCallbackViews;

      for (let i = 0; i < this.callbackCount; i++) {
        if (views[i] === view) {
          views[i] = null;
        }
      }
    }

    applyLayout () {
      const newLayout = this.layoutNode.getComputedLayout();
      const cached = this.cachedLayout;

      const boundsDirty = newLayout.left !== cached.x || newLayout.top !== cached.y ||
        newLayout.width !== cached.width || newLayout.height !== cached.height;

      if (boundsDirty) {
        cached.x = newLayout.left;
        cached.y = newLayout.top;
        cached.width = newLayout.width;
        cached.height = newLayout.height;

        const anchorOffsetX = this.anchorX * cached.width;
        const anchorOffsetY = this.anchorY * cached.height;

        this.position.set(
          cached.x + anchorOffsetX + this.offsetX,
          cached.y + anchorOffsetY + this.offsetY
        );

        this.pivot.set(cached.width * this.anchorX, cached.height * this.anchorY);

        this._onLayout(cached.x, cached.y, cached.width, cached.height);

        if (boundsDirty && this.onLayout) {
          this._getLayoutRoot().addToCallbackPool(this);
        }
      }

      const childCount = this.children.length;

      for (let i = 0; i < childCount; i++) {
        const child = this.children[i];
        child.__isLayoutNode && child.applyLayout();
      }
    }

    _renderCount = 0;

    render (renderer) {

      if (!this.sortableChildren) {
        return super.render(renderer);
      }

      const { children } = this;

      if (!this._sortedChildren) {
        this._sortedChildren = children.slice();
      }

      this.children = this._sortedChildren;
      super.render(renderer);
      this.children = children;
    }

    updateTransform () {
      if (this.layoutNode.isDirty()) {
        const root = this._getLayoutRoot();
        if (root === this) {
          this.updateLayoutGraph();
        }
      }

      super.updateTransform();
    }

    updateLayoutGraph () {
      this.layoutAttemptCount++;
      this.layoutNode.calculateLayout();
      this.applyLayout();

      for (let i = 0; i < this.callbackCount; i++) {
        const view = this.layoutCallbackViews[i];

        if (view) {
          const { x, y, width, height } = view.cachedLayout;
          this.layoutCallbackViews[i].onLayout(x, y, width, height);
          this.layoutCallbackViews[i] = null;
        }
      }

      this.callbackCount = 0;

      if (this.layoutNode.isDirty() && this.layoutAttemptCount <= MAX_LAYOUT_ATTEMPTS) {
        this.updateLayoutGraph();
      }

      this.layoutAttemptCount--;
    }

    _onLayout (x, y, width, height) {
    }

    onChildrenChange (_length) {
      super.onChildrenChange(_length);

      const n = this.layoutNode;
      const childCount = this.children.length;
      const layoutChildCount = n.getChildCount();

      let hasNewChildren = false;
      let childIndex = -1;

      for (let i = 0; i < childCount; i++) {
        const child = this.children[i];

        if (!child.__isLayoutNode) {
          continue;
        }

        if (!hasNewChildren) {
          hasNewChildren = true;
          this.updateMeasureFunction(true);
        }

        childIndex++;

        const childNode = child.layoutNode;
        const currentNodeAtIndex = i < layoutChildCount ? n.getChild(childIndex) : null;

        if (childNode === currentNodeAtIndex) {
          continue;
        }

        if (childNode.getParent() === n) {
          n.removeChild(childNode);
        }

        n.insertChild(childNode, childIndex);
      }

      childIndex++;

      const amountToDrop = layoutChildCount - childIndex;

      for (let i = 0; i < amountToDrop; i++) {
        const node = n.getChild(childIndex);
        node.getParent().removeChild(node);
      }

      !hasNewChildren && this.updateMeasureFunction(false);

      if (this._sortedChildren) {
        this._sortedChildren = this.children.slice();
      }
    }

    _getLayoutRoot () {
      let layoutRoot = this;

      while (layoutRoot.parent?.__isLayoutNode) {
        layoutRoot = layoutRoot.parent;
      }

      return layoutRoot;
    }

    updateMeasureFunction (hasChildren) {
      if (this._isMeasureFunctionSet && hasChildren) {
        this._isMeasureFunctionSet = false;
        this.layoutNode.setMeasureFunc(null);
      } else if (!this._isMeasureFunctionSet && !hasChildren && this.measure) {
        this._isMeasureFunctionSet = true;
        this.layoutNode.setMeasureFunc(
          (node, width, widthMode, height, heightMode) =>
            this.measure(node, width, widthMode, height, heightMode)
        );
      }
    }

    destroy (options) {
      if (this.onLayout) {
        this._getLayoutRoot().removeFromCallbackPool(this);
      }

      super.destroy(options);

      this.layoutNode.free();
      this.layoutNode = null;
    }

    get layoutStyle () {
      return this._layoutStyle;
    }

    set layoutStyle (value) {
      if (this._layoutStyle === value) {
        return;
      }

      const oldStyle = this._layoutStyle || NO_STYLE;
      this._layoutStyle = value ? mergeStyles(value) : NO_STYLE;
      applyLayoutProperties(this.layoutNode, oldStyle, value);

      const {
        scaleX = this.scale.x,
        scaleY = this.scale.y,
        blendMode = this.blendMode,
        filters = this.filters,
        offsetX = 0,
        offsetY = 0,
        rotation = this.rotation,
        visible = this.visible,
        tint = this.tint,
        zIndex = this.zIndex
      } = this._layoutStyle;

      this.blendMode = blendMode;
      this.filters = filters;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      this.rotation = rotation;
      this.visible = visible;
      this.tint = tint;
      this.zIndex = zIndex;
      this.scale.set(scaleX, scaleY);
    }

  };

  result.prototype.__isLayoutNode = true;

  return result;
}
