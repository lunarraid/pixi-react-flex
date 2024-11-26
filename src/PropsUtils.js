import { Point, Texture } from '@pixi/core';

const eventHandlers = [
  'click',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'mouseupoutside',
  'tap',
  'touchstart',
  'touchmove',
  'touchend',
  'touchendoutside',
  'pointercancel',
  'pointerleave',
  'pointerout',
  'pointerover',
  'pointertap',
  'pointerdown',
  'pointerup',
  'pointerupoutside',
  'pointermove',
  'rightclick',
  'rightdown',
  'rightup',
  'rightupoutside',
  'touchcancel',
  'touchendoutside',
  'touchmove',
  'touchstart'
];

const PROPS_EVENTS = eventHandlers.reduce((PROPS_EVENTS, eventName) => {
  PROPS_EVENTS[eventName] = true;
  return PROPS_EVENTS;
}, {});

const PROPS_DISPLAY_OBJECT = {
  alpha: 1,
  cacheAsBitmap: false,
  cursor: null,
  eventMode: 'none',
  filterArea: null,
  filters: null,
  hitArea: null,
  mask: null,
  pivot: new Point(),
  renderable: true,
  rotation: 0,
  scale: new Point(1, 1),
  skew: new Point(0, 0),
  visible: true,
  x: 0,
  y: 0
};

const EVENT_COUNT = eventHandlers.length;

const IGNORE_PROPS = {
  children: true,
  parent: true
};

const NO_STYLE = {};

export function getTextureFromProps (root, props = {}) {

  function emitChange (texture) {
    requestAnimationFrame(() => texture?.__reactpixi?.root?.emit(`__REACT_PIXI_REQUEST_RENDER__`));
  }

  if (props.texture) {
    return props.texture;
  } else if (props.style?.texture) {
    return props.style.texture;
  }

  let { image = props.image, video = props.video, source = props.source } = props;

  if (props.style) {
    image = props.style.image || image;
    video = props.style.video || video;
    source = props.style.source || source;
  }

  const result = image || video || source || null;

  if (!result) {
    return null;
  }

  const texture = Texture.from(result);

  texture.__reactpixi = { root };
  texture.once('update', emitChange);

  if (texture.valid) {
    emitChange(texture);
  }

  return texture;
}

export function applyDefaultStyleProps(instance, oldProps, newProps) {
  let changed = false;

  for (const propName in oldProps) {

    if (!(propName in newProps)) {
      if (propName in PROPS_DISPLAY_OBJECT) {
        instance[propName] = PROPS_DISPLAY_OBJECT[propName];
        changed = true;
      } else if (propName[PROPS_EVENTS]) {
        instance.removeListener(propName, oldProps[propName]);
        changed = true;
      } else {
        console.warn(`ignoring prop: ${ propName }, from ${ instance[propName] } to ${ newProps[propName] } for`, instance);
      }
    }
  }

  if (oldProps.style !== newProps.style) {
    instance.layoutStyle = newProps.style;
    changed = true;
  }

  for (const propName in newProps) {
    if (oldProps[propName] !== newProps[propName]) {

      if (PROPS_EVENTS[propName]) {

        if (oldProps[propName]) {
          instance.removeListener(propName, oldProps[propName]);
          changed = true;
        }

        if (newProps[propName]) {
          instance.on(propName, newProps[propName]);
          changed = true;
        }

      } else if (!IGNORE_PROPS[propName] && instance[propName] !== undefined) {
        instance[propName] = newProps[propName];
        changed = true;
      }
    }
  }

  return changed;
}

export function applyDefaultTextureProps (instance, oldProps, newProps, onTextureUpdate = null) {
  const { image: oldImage = oldProps.image, texture: oldTexture = oldProps.texture } = oldProps.style || oldProps;
  const { image: propsImage, texture: propsTexture, style, ...props } = newProps;
  const { image = propsImage, texture = propsTexture } = newProps.style || newProps;

  let changed = applyDefaultStyleProps(instance, oldProps, newProps);

  if ((texture && oldTexture !== texture) || (image && oldImage !== image)) {

    const root = instance.__reactpixi?.root || null;

    if (oldProps.texture !== newProps.texture) {
      changed = true;
    }

    const newTexture = getTextureFromProps(root, newProps) || Texture.WHITE;

    instance.texture = newTexture;

    if (newTexture && onTextureUpdate) {
      if (newTexture.baseTexture.valid) {
        onTextureUpdate();
      } else {
        newTexture.once('update', onTextureUpdate);
      }
    }
  }

  return changed;
}
