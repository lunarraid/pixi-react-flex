import { forwardRef } from 'react';
import AbstractText from './AbstractText.js';

const FlexText = forwardRef(function FlexText (props, ref) {
  return (
    <AbstractText { ...props } ref={ ref } View="pixiText" />
  );
});

export default FlexText;
