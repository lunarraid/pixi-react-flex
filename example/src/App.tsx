import { Application } from '@pixi/react';
import { Container, Graphics } from '@lunarraid/pixi-react-flex';
import { animated, easings, useSpring, type SpringConfig } from '@lunarraid/pixi-react-flex/react-spring';
import { Graphics as PixiGraphics } from 'pixi.js';

function draw (g: PixiGraphics) {
  g.clear();
  g.rect(0, 0, 100, 100);
  g.fill('white');
}

const animConfig: SpringConfig = {
  easing: easings.easeOutBounce,
  duration: 2000
};

function TestAnimation() {
  const props = useSpring({
    from: { marginLeft: 0, alpha: 0 },
    to: { marginLeft: 200, alpha: 1 },
    delay: 2000,
     config: animConfig
  });

  return <animated.Graphics { ...props } draw={ draw } />
}

export default function App () {
  return (
    <Application>
      <Container>
        <Graphics draw={ draw } />
        <TestAnimation />
      </Container>
    </Application>
  );
}
