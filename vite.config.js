import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

/* 📦 배포 버전 파일 자동 생성
   src/LittleJuniorWorld.jsx 의 APP_VERSION 을 그대로 읽어 dist/version.json 으로 구워냅니다.
   → 배포할 때 따로 손댈 파일이 없어요. APP_VERSION 만 올리면 끝. */
function versionJson() {
  const readVersion = () => {
    try {
      const src = readFileSync(new URL("./src/LittleJuniorWorld.jsx", import.meta.url), "utf-8");
      const m = /const\s+APP_VERSION\s*=\s*["'`]([^"'`]+)["'`]/.exec(src);
      return m ? m[1] : "";
    } catch (e) {
      return "";
    }
  };
  return {
    name: "echo-version-json",
    /* 빌드 산출물에 version.json 을 넣습니다 (base 경로 아래로 배포돼요) */
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: readVersion(), builtAt: new Date().toISOString() }, null, 2) + "\n",
      });
    },
    /* dev 서버에서도 같은 주소로 응답 (개발 중엔 팝업이 꺼져 있지만 확인용) */
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || "").split("?")[0];
        if (!path.endsWith("/version.json")) return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({ version: readVersion(), builtAt: new Date().toISOString() }));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionJson()],
  base: "/echogame/",
});
