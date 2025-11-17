import { forwardRef } from 'react';
import AbstractText from './AbstractText.jsx';

const FlexBitmapText = forwardRef(function FlexBitmapText (props, ref) {
  return (
    <AbstractText { ...props } ref={ ref } View="pixiBitmapText" />
  );
});

export default FlexBitmapText;
