import { forwardRef } from 'react';
import AbstractText from './AbstractText.jsx';

const FlexHTMLText = forwardRef(function FlexHTMLText (props, ref) {
  return (
    <AbstractText { ...props } ref={ ref } View="pixiHTMLText" />
  );
});

export default FlexHTMLText;
