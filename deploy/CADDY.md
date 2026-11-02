# Caddy 配置与重载

## 2026-10-28 站点地图继续排查

- Caddy 新增 `@crawlFiles`，将 `/robots.txt`、`/sitemap.xml`、`/sitemap-pages.xml` 统一直接交给 `file_server`；不依赖正文 Node 服务。
- 三个抓取入口统一返回 `Cache-Control: no-cache, must-revalidate`，修正原地图及 robots.txt 的一周缓存。
- 仅这些入口记录访问日志：`/var/log/caddy/kidstory-crawl.json`；其他页面通过 Caddy 2.6 的 `skip_log` 排除。Cookie、Authorization、Proxy-Authorization、Referer 不记录，单文件 5 MB，保留 3 个轮转文件。
- 配置备份：`/home/ubuntu/Caddyfile.before-sitemap-20261028`。已执行 `caddy validate` 和无中断 reload。
- 官方 sitemap XSD 校验通过，17 个网址；robots.txt 是有效 UTF-8，TLS 证书有效至 2026-12-07；Search Console 无人工处置措施。
- 未将“提交成功”或“实时测试成功”等同于 sitemap 后台读取成功；后续验收须同时核对地图报告和爬虫访问日志。
- 12:28 左右日志记录 Google-InspectionTool 从 `66.249.70.68`、`66.249.70.67` 抓取 `/sitemap-pages.xml`，HTTP 200；两个 IP 的反向域名为 googlebot.com，正向解析回原 IP。该证据证明实时检查成功，尚不能替代普通地图读取结果。
- 已设置本聊天每小时自动复查（automation id `kidstory`）：无变化时静默；地图报告成功且发现网址后通知并停止。2026-10-28 本轮结束时地图报告仍为“无法抓取”，不可提前记录为已解决。
- 随后复查抓取统计：报告更新至 2026-10-25，www 主机过去 90 天 2,171 次抓取、96% 为 HTTP 200，robots.txt 提取、DNS 解析与服务器连接均在正常范围。
- Google robots.txt 报告仍保存 2026-10-17 00:50 的 www HTTPS 版本（332 字节），旧内容允许抓取并引用 sitemap.xml；当前版本为 338 字节，引用 sitemap-pages.xml。已从该报告请求重新抓取 www HTTPS robots.txt，等待 Google 更新；旧规则并未屏蔽 sitemap，不能将旧缓存认定为已证实根因。
- robots 重抓已有结果：Google 报告更新至 2026-10-28 12:33、338 字节、已提取；服务器日志 04:34:34–35 UTC 记录三个普通 Googlebot 请求，均为 200。缓存更新确认后，仅对固定 sitemap-pages.xml 再提交一次，继续等待地图报告成功。

## 2026-10-28 Google 搜索优化发布

- 当前 release：`/home/ubuntu/www/illustration-releases/seo-20261028-gsc-r2`，`seo-current` 已指向该目录。
- 新增角色一致性、分镜提示词、PDF 排版三篇 `/guides/ai-picture-book-*` 教程；首页、功能页和总教程加入对应内链。
- sitemap 共 17 个不重复网址，移除无法核实的统一旧更新时间；实际更新的教程及首页使用 2026-10-28。
- 应用页面保留 noindex，并在初始 HTML 中声明无临时参数的 canonical；客户端加载后移除 `_chunk_reload`，保留其他参数、锚点与路由状态。
- 11 项测试通过；线上六个正文页、10 张教程图片、sitemap 与真实 404 已验证。
- 前一 release `seo-20261027-r1` 完整保留；本次未修改 Caddy 或后端。
- 回退：将 `seo-current` 原子切回 `seo-20261027-r1`，再运行 `sudo systemctl restart kidstory-seo`。
- Search Console：2026-10-28 已重新提交 sitemap.xml，并移除误提交的首页记录；提交成功与 Google 抓取成功应分别判断。
- 原 sitemap.xml 仍显示无法读取，新增内容相同的 `/sitemap-pages.xml` 并在 robots.txt 中声明，作为新的读取测试地址；构建插件会同步生成两个文件，正文服务支持该新路径。
- 新地图已提交；Google 实际版本测试显示允许抓取、网页抓取成功，查看被测试网页可见 XML 源码。站点地图列表仍显示无法抓取，后续应复查地图报告，不能将实时测试成功等同于地图处理成功。
- 三篇新增教程均已收到 Search Console“已请求编入索引”确认；带 `_chunk_reload` 重复网址的验证状态已变为“已开始”。

## 2026-10-27 线上发布记录

本次已发布至 `https://www.kidstory.cc`，使用独立发布目录，不覆盖原 `illustration/dist`：

- 发布目录：`/home/ubuntu/www/illustration-releases/seo-20261027-r1`
- 当前指针：`/home/ubuntu/www/illustration-releases/seo-current`
- Caddy 静态根目录：`/home/ubuntu/www/illustration-releases/seo-current/dist`
- 正文服务：`kidstory-seo.service`，监听 `127.0.0.1:4100`，已设置开机启动。
- Node：`/home/ubuntu/.nvm/versions/node/v20.19.5/bin/node`。此服务器没有 `/usr/bin/node`。
- 备份及验收记录：`/home/ubuntu/deploy-backups/seo-20261027-r1/`，其中 `verification-https.log` 保存完整线上验收结果。
- 旧前端仍在 `/home/ubuntu/www/illustration/dist`；后端只更新了博客和插画两个 controller，其他构建文件未替换。

博客中的旧 Base64 封面会转换为内容哈希命名的图片，保存在当前发布目录的 `dist/blog-assets/inline-covers/`。正文服务需要对这个目录有写权限。列表保留原图，HTML 不再重复内嵌大段 Base64。

**后续发布必须构建新的独立 release，更新 `seo-current` 后重启正文服务。旧 `deploy.sh` 仅构建仓库的 `dist`，不能独立更新本次线上 release。** 以下原仓库目录说明仅作为首次安装参考，线上以本节路径为准。

服务器的 Caddy systemd 单元没有 reload 接口，配置更新应使用其自带命令：

```bash
sudo /home/ubuntu/www/caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo /home/ubuntu/www/caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

需要恢复发布前的网站时，先恢复 Caddy，原前端目录仍完整保留：

```bash
sudo cp /home/ubuntu/deploy-backups/seo-20261027-r1/Caddyfile /etc/caddy/Caddyfile
sudo /home/ubuntu/www/caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo /home/ubuntu/www/caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

后端若也需回退，恢复对应源码和编译文件，再重启 PM2；不要回退数据库或公开作品数据：

```bash
cd /home/ubuntu/www/clouddrawing
cp /home/ubuntu/deploy-backups/seo-20261027-r1/blog.before.ts src/controllers/blog.ts
cp /home/ubuntu/deploy-backups/seo-20261027-r1/illustration.before.ts src/controllers/illustration.ts
cp /home/ubuntu/deploy-backups/seo-20261027-r1/blog.js dist/controllers/blog.js
cp /home/ubuntu/deploy-backups/seo-20261027-r1/illustration.js dist/controllers/illustration.js
pm2 restart clouddrawing
```

KidStory 前端静态文件目录：`/home/ubuntu/www/illustration/dist`

完整配置示例见 [`Caddyfile.example`](./Caddyfile.example)。

构建输出首页、AI 绘本介绍、教程和指南目录的静态正文，同时从 Vue 路由自动生成 `app-routes.json`。公开作品与文章由 `scripts/public-seo-server.cjs` 在请求时读取匿名公开 API 并渲染，因此发布、撤回和删除无需重新构建正文。服务器不转发访客 Cookie 或 Authorization，接口故障返回 503，未公开或不存在的详情返回 404。不要保留无条件的 `/app.html` 或 `/index.html` fallback。

## 上线前提与顺序

1. 先发布后端 `/ill/public` 及 `/api/blog/` 的 `page` 分页支持；前者仅返回公开且非草稿的插画，原 `/ill/` 私有列表不变。
2. 在前端仓库运行 `npm ci`、`npm run build`、`npm run test:seo` 和 `node --test scripts/test-public-seo-server.cjs`。
3. 确认 `command -v node`，如不是 `/usr/bin/node`，调整 service 的 ExecStart。安装并启动正文服务：

```bash
sudo cp deploy/kidstory-seo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kidstory-seo
curl -f http://127.0.0.1:4100/books
curl -f http://127.0.0.1:4100/blog
curl -f http://127.0.0.1:4100/illustration
```

4. 服务检查通过后，再备份、合并、校验并重载下方 Caddy 配置。切换后的公开页面依赖正文服务，应同时监控服务和 API 的可用性。服务故障时返回 502/503，而非伪装成成功的空页面。
5. 后续前端更新构建完成后运行 `sudo systemctl restart kidstory-seo`，刷新内存中的路由清单和应用模板。

`SEO_API_ORIGIN` 可指定后端地址，`SEO_DIST_DIR` 可指定构建目录，`SEO_PORT` 默认4100；服务只监听127.0.0.1。默认不缓存公开内容，避免已撤回作品继续通过旧缓存展现。

## 1. SSH 登录

```bash
ssh ubuntu@119.45.172.191
```

## 2. 查看现有配置

```bash
sudo cat /etc/caddy/Caddyfile
ls /etc/caddy/Caddyfile.d/ 2>/dev/null
```

## 3. 备份并编辑

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date +%Y%m%d)
sudo nano /etc/caddy/Caddyfile
```

将 `www.kidstory.cc { ... }` 块替换为 `Caddyfile.example` 中的内容（或合并 `@static` + `try_files` 两段 `handle`）。

## 4. 校验

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

必须看到有效配置后再 reload。

## 5. 重载（推荐，不中断）

```bash
sudo systemctl reload caddy
sudo systemctl status caddy
```

失败时可重启：

```bash
sudo systemctl restart caddy
```

## 6. 手动验证

```bash
SITE=https://www.kidstory.cc

curl -I "$SITE/"
curl -I "$SITE/books"
curl -I "$SITE/blog"
curl -I "$SITE/sitemap.xml"

# 真实 JS 应 200
curl -I "$SITE/js/$(ls /home/ubuntu/www/illustration/dist/js/*.js | head -1 | xargs basename)"

# 不存在的 JS 必须 404（不能 200 + HTML）
curl -I "$SITE/js/__missing__.js"
```

## 7. 与前端部署顺序

1. 后端公开接口、前端构建和正文服务均可用后，再更新 Caddy 并 `reload`。
2. 后续构建发布后重启 `kidstory-seo`，运行页面和状态码检查。
3. 在百度抓取诊断中确认 `/books`、`/blog`、`/illustration` 返回标题、正文及真实链接；再按后台配额提交有效公开链接。

## 回滚

```bash
sudo cp /etc/caddy/Caddyfile.bak.YYYYMMDD /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
