import { Texture } from '@pixi/core';
import { applyDefaultProps } from '@pixi/react';

export function getTextureFromProps (elementType, root, props = {}) {

  function emitChange (texture) {
    requestAnimationFrame(() => texture?.__reactpixi?.root?.emit(`__REACT_PIXI_REQUEST_RENDER__`));
  }

  if (props.texture) {
    return props.texture;
  }

  const { image = props.image, video = props.video, source = props.source } = props.style || props;
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

export function applyDefaultStyleProps (instance, oldProps, newProps) {
  const { style, ...props } = newProps;
  instance.layoutStyle = style;
  applyDefaultProps(instance, oldProps, props);
}

export function applyDefaultTextureProps (instance, oldProps, newProps, onTextureUpdate = null) {
  const { image: oldImage = oldProps.image, texture: oldTexture = oldProps.texture } = oldProps.style || oldProps;
  const { image: propsImage, texture: propsTexture, style, ...props } = newProps;
  const { image = propsImage, texture = propsTexture } = newProps.style || newProps;

  instance.layoutStyle = style;

  let changed = applyDefaultProps(instance, oldProps, props);

  if ((texture && oldTexture !== texture) || (image && oldImage !== image)) {

    const root = instance.__reactpixi?.root || null;

    if (oldProps.texture !== newProps.texture) {
      changed = true;
    }

    const newTexture = getTextureFromProps('FlexNineSliceSprite', root, newProps) || Texture.WHITE;

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
