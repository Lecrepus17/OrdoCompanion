import React from 'react';
import { Composition, Still } from 'remotion';
import { PromoVideo, ThumbnailStill } from './Promo';

// 45 seconds at 30fps = 1350 frames
const FPS = 30;
const DURATION_IN_FRAMES = 1350;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Promo16x9"
        component={PromoVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Promo9x16"
        component={PromoVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Still
        id="Thumbnail"
        component={ThumbnailStill}
        width={1920}
        height={1080}
      />
    </>
  );
};
