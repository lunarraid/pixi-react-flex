import { forwardRef } from 'react';
import AbstractText, { AbstractTextProps } from './AbstractText';

const FlexBitmapText = forwardRef(function FlexBitmapText (props: AbstractTextProps, ref) {
  return (
    <AbstractText { ...props } ref={ ref } View="pixiBitmapText" />
  );
});

FlexBitmapText.displayName = 'BitmapText';

export default FlexBitmapText;
