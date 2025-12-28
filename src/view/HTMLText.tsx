import { forwardRef } from 'react';
import AbstractText, { AbstractTextProps } from './AbstractText';

const FlexHTMLText = forwardRef(function FlexHTMLText (props: AbstractTextProps, ref) {
  return (
    <AbstractText { ...props } ref={ ref } View="pixiHtmlText" />
  );
});

FlexHTMLText.displayName = 'HTMLText';

export default FlexHTMLText;
