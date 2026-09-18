import { Texture } from 'pixi.js';
import { Style } from '../flex/applyLayoutProperties';

export default function getTextureFromProps (props: { texture?: Texture; image?: string, style?: Style; }) {

  let texture: Texture | undefined;

  if (props.texture) {
    texture = props.texture;
  } else if (props.image) {
    texture = Texture.from(props.image);
  } else if (props.style?.texture instanceof Texture) {
    texture = props.style.texture;
  } else if (typeof props.style?.image === 'string') {
    texture = Texture.from(props.style.image);
  }

  return texture || Texture.WHITE;

}
