import { Texture } from 'pixi.js';

export default function getTextureFromProps (props) {

  let texture;

  if (props.texture) {
    texture = props.texture;
  } else if (props.image) {
    texture = Texture.from(props.image);
  } else if (props.style?.texture) {
    texture = props.style.texture;
  } else if (props.style?.image) {
    texture = Texture.from(props.style.image);
  }

  return texture || Texture.WHITE;

}
