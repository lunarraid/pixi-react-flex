import { forwardRef } from 'react';
import AbstractText from './AbstractText.js';

const FlexHTMLText = forwardRef(function FlexHTMLText (props, ref) {
  return (
    <AbstractText { ...props } ref={ ref } View="pixiHtmlText" />
  );
});

export default FlexHTMLText;
