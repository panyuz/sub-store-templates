# sub-store-templates

Sub-Store 使用的 sing-box 配置模板与转换脚本。

## 当前主力（sing-box 1.14）

| 文件 | 说明 |
|---|---|
| `sb_1.14_v4.json` | **Sub-Store 底板模板**（IPv4-only）：AAAA/HTTPS/SVCB 记录直接 NOERROR 空应答，tun 仅 IPv4 地址，fakeip 无 inet6_range |
| `sb_1.14_v6.json` | **Sub-Store 底板模板**（IPv4+IPv6 双栈）：tun 双地址，fakeip 带 inet6_range，`prefer_ipv4` |
| `merge_sb_1.14_v4.js` / `merge_sb_1.14_v6.js` | 配套 Sub-Store 脚本操作（两份内容相同，按模板命名区分） |

> 模板**不是给 sing-box 直接跑的完整配置**：策略组内出站为占位，由 Sub-Store 脚本操作拉取订阅节点、填充分组后生成最终 config。`sing-box check` 仅验证底板语法。

## 规则集来源

统一使用 **MetaCubeX/meta-rules-dat**（`sing` 分支，社区事实标准、每日自动构建），
经 `testingcf.jsdelivr.net` CDN 下载（国内可达，比 gh 前缀代理稳定）：

- **AI 分流（重点）**：`category-ai-!cn.srs`（覆盖 OpenAI/Claude/Cursor/Windsurf/Grok/Perplexity/Poe/Copilot/HuggingFace/Midjourney 等）+ `google-gemini.srs`（该 category 不含 Gemini，需单独补充）→ `🤖 AI` 组
- CN 分流：`geo-lite/geosite/cn.srs` + `geoip/cn.srs`
- 其他：`geolocation-!cn` / `private` / `category-ads` / `github` / `paypal` / `microsoft@cn` / `apple-cn`

注意：jsdelivr 只能代理仓库文件，不能代理 Release 资产（如 DustinWin 的 `.srs` 是 release 资产），所以不用。

## 1.14 写法要点

- DNS 新格式 `{"type": "https|udp|local|fakeip", ...}`（legacy `address` 已在 1.14 移除）
- **DNS 防泄漏**：`evaluate(local)` → `match_response: cn_ip` → 命中返回本地结果，否则落 fakeip 走代理（未知域名先本地解析，是国内 IP 才直连）
- `http_clients` + `route.default_http_client`：规则集下载显式走 direct（1.14 废弃隐式默认出站，1.16 移除）
- `sniff` 前置到第一条路由规则；fakeip 为 DNS 服务器形式；`store_fakeip`/`store_dns` 持久化
- 自定义模式 `AllowAds` 控制广告拦截开关

## Sub-Store 用法

脚本操作（Script Operation）指向 `merge_sb_1.14_*.js`，模板作为 `$files[0]` 传入：

- `name`：订阅/集合名
- `type`：`1`/`col` 开头为集合，否则订阅
- `rules`：可选，自定义规则文件（JSON 数组，去重后插在 global 模式规则之后）

脚本行为：按节点名正则分类（JMS🧦/DMIT⭕/Azure☁️/Softbank/魔戒🐐-排除）、
填充 `♻️ 中转分组`、`🛬 落地分组`、`🚀 节点选择`、`🤖 AI`（可独立钉选任意节点）。

## 其他文件

- `singbox_new.json` / `singbox_ipv6_new.json`：旧版模板（v4 为 1.12 风格、v6 为 1.13/1.14 风格），保留对照
- `merge.js` / `merge_v6.js`：旧版转换脚本（与旧模板配套）
- `compile.sh`：用 `singbox/sing-box.exe` 将 `rulesets/*.json` 编译为 `.srs`
- `ip2domain.js`：节点操作符，server IP→域名映射
- `singbox-external.js`：external 类型节点改用 `/usr/local/bin/sing-box`

## 验证（底板语法）

```bash
sing-box check -c sb_1.14_v4.json
sing-box check -c sb_1.14_v6.json
node --check merge_sb_1.14_v4.js
```