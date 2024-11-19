import { forwardRef } from 'react';
import AbstractText from './AbstractText.jsx';

const FlexText = forwardRef(function FlexText (props, ref) {
  return (
    <AbstractText { ...props } ref={ ref } View="text" />
  );
});

export default FlexText;
