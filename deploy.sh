#!/bin/bash
# 前端代码部署脚本
# 使用方法: ./deploy.sh

echo "开始部署前端代码到服务器..."

# 1. 登录服务器并执行部署命令
ssh ubuntu@119.45.172.191 << 'EOF'
set -e

cd /home/ubuntu/www/illustration

echo "当前目录: $(pwd)"
echo "当前分支: $(git branch --show-current)"

# 2. 拉取最新代码
echo "正在拉取最新代码..."
git pull origin main

# 3. 安装依赖
echo "正在安装依赖..."
npm install

# 4. 构建生产版本（清空 dist，避免旧 chunk 残留导致 hash 不一致）
echo "正在构建生产版本..."
rm -rf dist
npm run build

if [ ! -f dist/index.html ] || [ ! -d dist/js ]; then
    echo "错误: 构建产物不完整"
    exit 1
fi
JS_COUNT=$(ls dist/js/*.js 2>/dev/null | wc -l)
echo "构建产物: ${JS_COUNT} 个 JS 文件"

# 正文服务缓存应用模板与路由清单，构建后须刷新。首次安装按 deploy/CADDY.md 操作。
if systemctl list-unit-files kidstory-seo.service --no-legend | grep -q kidstory-seo; then
  sudo systemctl restart kidstory-seo
fi

# 5. 校验懒加载 chunk 存在且为 JS（非 index.html 回退）
UPLOAD_BOOK_CHUNK=$(ls dist/js/upload-local-book.*.js 2>/dev/null | head -1)
if [ -z "$UPLOAD_BOOK_CHUNK" ]; then
  echo "警告: 未找到 upload-local-book chunk"
else
  echo "upload-local-book chunk: $(basename "$UPLOAD_BOOK_CHUNK")"
  if head -c 20 "$UPLOAD_BOOK_CHUNK" | grep -q '<'; then
    echo "错误: chunk 文件内容异常（像 HTML）"
    exit 1
  fi
fi

# 6. 线上 Caddy / SPA 路由 smoke test
SITE="${DEPLOY_SMOKE_SITE:-https://www.kidstory.cc}"
echo ""
echo "正在验证 ${SITE} ..."

check_http_code() {
  local url="$1"
  local expect="$2"
  local label="$3"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "$url" || echo "000")
  if [ "$code" != "$expect" ]; then
    echo "  ✗ ${label}: 期望 HTTP ${expect}，实际 ${code} — ${url}"
    return 1
  fi
  echo "  ✓ ${label}: HTTP ${code}"
  return 0
}

SMOKE_FAILED=0
check_http_code "${SITE}/" "200" "首页" || SMOKE_FAILED=1
check_http_code "${SITE}/books" "200" "SPA 路由 /books" || SMOKE_FAILED=1
check_http_code "${SITE}/blog" "200" "SPA 路由 /blog" || SMOKE_FAILED=1
check_http_code "${SITE}/sitemap.xml" "200" "sitemap.xml" || SMOKE_FAILED=1
check_http_code "${SITE}/robots.txt" "200" "robots.txt" || SMOKE_FAILED=1
check_http_code "${SITE}/__missing_page__" "404" "不存在的页面" || SMOKE_FAILED=1
check_http_code "${SITE}/blog/__missing_post__" "404" "不存在的文章" || SMOKE_FAILED=1
check_http_code "${SITE}/books/not-a-valid-id" "404" "无效作品编号" || SMOKE_FAILED=1

for PUBLIC_PATH in books blog illustration; do
  if ! curl -fsS --max-time 20 "${SITE}/${PUBLIC_PATH}" | grep -q '<h1>'; then
    echo "错误: /${PUBLIC_PATH} 未返回可抓取正文"
    SMOKE_FAILED=1
  fi
done

FIRST_JS=$(ls dist/js/*.js 2>/dev/null | head -1)
if [ -n "$FIRST_JS" ]; then
  JS_NAME=$(basename "$FIRST_JS")
  check_http_code "${SITE}/js/${JS_NAME}" "200" "静态 JS /js/${JS_NAME}" || SMOKE_FAILED=1
else
  echo "  ⚠ 跳过 JS 线上检查：dist/js 为空"
fi

MISSING_JS_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "${SITE}/js/__deploy_smoke_missing__.js" || echo "000")
if [ "$MISSING_JS_CODE" = "404" ]; then
  echo "  ✓ 缺失 JS 返回 404（未错误 fallback 到 index.html）"
else
  echo "  ✗ 缺失 JS 应返回 404，实际 ${MISSING_JS_CODE}（若 200 请检查 Caddy @static 是否在 try_files 之前）"
  SMOKE_FAILED=1
fi

MISSING_JS_HEAD=$(curl -sS --max-time 15 "${SITE}/js/__deploy_smoke_missing__.js" 2>/dev/null | head -c 20 || true)
if echo "$MISSING_JS_HEAD" | grep -q '<'; then
  echo "  ✗ 缺失 JS 响应体像 HTML — Caddy 配置有误，见 deploy/Caddyfile.example"
  SMOKE_FAILED=1
fi

echo ""
if [ "$SMOKE_FAILED" -ne 0 ]; then
  echo "部署构建完成，但线上 smoke test 未全部通过。"
  echo "请检查 Caddy 配置并重载："
  echo "  文档: deploy/CADDY.md"
  echo "  示例: deploy/Caddyfile.example"
  echo "  命令: sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy"
  exit 1
fi

echo "部署完成，线上 smoke test 已通过。"
echo "若用户仍 ChunkLoadError：强刷 Ctrl+Shift+R 或清除站点缓存。"
EOF

echo "部署脚本执行完毕"
