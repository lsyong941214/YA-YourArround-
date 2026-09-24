const aitDevtools = require("@apps-in-toss/devtools/unplugin").default;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  webpack: (config) => {
    // ait init이 vite/webpack/rspack/rollup 독립 설정 파일만 자동 감지해서, next.config.js
    // 내부 webpack() 콜백에는 수동으로 꽂아야 한다(공식 미지원 대상이지만 devtools 패키지가
    // unplugin 기반이라 webpack 진입점 자체는 존재함). entryPattern 기본값이
    // main/index/entry/app 파일명만 찾는데 App Router엔 그런 진입점이 없어서, 루트
    // layout.tsx를 패널 자동 주입 대상으로 지정한다. initialState/mcp 옵션은 Vite 전용이라
    // webpack에선 조용히 무시된다(devtools 패키지 타입 선언 참고).
    config.plugins.unshift(
      aitDevtools.webpack({ entryPattern: /\/layout\.[tj]sx?$/i })
    );
    return config;
  },
};

module.exports = nextConfig;
