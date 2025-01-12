import mergeStyles from './mergeStyles';
import applyLayoutProperties from './applyLayoutProperties';
import { Config, Node, POSITION_TYPE_ABSOLUTE } from 'typeflex';

const nodeConfig = Config.create();
nodeConfig.setPointScaleFactor(0);

const NO_STYLE = {};
const MAX_LAYOUT_ATTEMPTS = 3;

const EXTRA_STYLE_PROPS = {
  alpha: 1,
  anchorX: 0.5,
  anchorY: 0.5,
  blendMode: 0,
  filters: [],
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  visible: true,
  tint: 0xffffff,
  zIndex: 0,
  sortableChildren: false
};

export default function LayoutMixin (BaseClass) {
  const result = class LayoutMixin extends BaseClass {

    constructor (...args) {
      super(...args);

      this._unsortedChildren = [];

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

    addChildAt (child, index) {
      this._onChildAdded(child, index);
      return super.addChildAt(child, index);
    }

    addChild (...children) {
      if (children.length === 1) {
        this._onChildAdded(children[0], this._unsortedChildren.length);
      }

      return super.addChild(...children);
    }

    removeChild (...children) {
      if (children.length === 1) {
        this._onChildRemoved(this._unsortedChildren.indexOf(children[0]));
      }

      return super.removeChild(...children);
    }

    removeChildAt (index) {
      this._onChildRemoved(index);
      return super.removeChildAt(index);
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

        this._updatePosition();

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

    getChildIndex (child) {
      return this._unsortedChildren.indexOf(child);
    }

    _updatePosition () {
      const cached = this.cachedLayout;
      const anchorOffsetX = this.anchorX * cached.width;
      const anchorOffsetY = this.anchorY * cached.height;

      this.position.set(
        cached.x + anchorOffsetX + this.offsetX,
        cached.y + anchorOffsetY + this.offsetY
      );

      this.pivot.set(cached.width * this.anchorX, cached.height * this.anchorY);
    }

    _renderCount = 0;

    updateTransform () {
      if (this.layoutNode?.isDirty()) {
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
      const style = this._layoutStyle = value ? mergeStyles(value) : NO_STYLE;

      applyLayoutProperties(this.layoutNode, oldStyle, style);

      for (const propName in EXTRA_STYLE_PROPS) {
        if (propName in oldStyle && style[propName] === undefined) {
          this[propName] = EXTRA_STYLE_PROPS[propName];
        } else if (propName in style) {
          this[propName] = style[propName];
        }
      }

      const { scaleX = 1, scaleY = 1, skewX = this.skew.x, skewY = this.skew.y } = style;

      this.scale.set(scaleX, scaleY);
      this.skew.set(skewX, skewY);
      this._updatePosition();
    }

    _onChildAdded (child, index) {

      if (index === this._unsortedChildren.length) {
        this._unsortedChildren.push(child);
      } else {
        this._unsortedChildren.splice(index, 0, child);
      }

      if (child.__isLayoutNode) {
        this.updateMeasureFunction(true);
        const insertionIndex = this.getLayoutIndex(index);
        this.layoutNode.insertChild(child.layoutNode, insertionIndex);
      }
    }

    _onChildRemoved (index) {
      const child = this._unsortedChildren[index];
      this._unsortedChildren.splice(index, 1);

      if (child.__isLayoutNode) {
        this.layoutNode.removeChild(child.layoutNode);
        this.updateMeasureFunction(this.layoutNode.getChildCount() > 0);
      }
    }

    getLayoutIndex (index) {
      const childCount = this._unsortedChildren.length;

      if (index >= childCount) {
        return childCount;
      }

      let result = 0;

      for (let i = 0; i < index; i++) {
        if (this._unsortedChildren[i].__isLayoutNode) {
          result++;
        }
      }

      return result;
    }

  };

  result.prototype.__isLayoutNode = true;

  return result;
}
