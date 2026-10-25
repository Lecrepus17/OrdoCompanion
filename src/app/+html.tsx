import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

// Root HTML template for Expo Web
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#121216" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Otimizações gerais para mobile web e toque */
              html, body, #root {
                height: 100%;
                width: 100%;
                margin: 0;
                padding: 0;
                overscroll-behavior-y: none;
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
              }
              /* Garante que safe area insets sejam respeitados */
              :root {
                --sat: env(safe-area-inset-top, 0px);
                --sar: env(safe-area-inset-right, 0px);
                --sab: env(safe-area-inset-bottom, 0px);
                --sal: env(safe-area-inset-left, 0px);
              }
              /* Scrollbars elegantes e discretas */
              ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              ::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
              }
              ::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.18);
                border-radius: 4px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.32);
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
