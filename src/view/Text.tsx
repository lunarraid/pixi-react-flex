import { forwardRef } from 'react';
import AbstractText, { AbstractTextProps } from './AbstractText';

const FlexText = forwardRef(function FlexText (props: AbstractTextProps, ref) {
  return (
    <AbstractText { ...props } ref={ ref } View="pixiText" />
  );
});

FlexText.displayName = 'Text';

export default FlexText;
