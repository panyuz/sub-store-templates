const { name, type = "0", rules: rulesFile } = $arguments;

const DIRECT_TAG = "🎯 全球直连";
const RELAY_TAG = "♻️ 中转分组";

// 1. 读取模板
let config = JSON.parse($files[0]);

// 2. 插入自定义路由规则，默认插在 global 模式后面，便于覆盖默认分流。
if (rulesFile) {
  try {
    const customRulesRaw = await produceArtifact({
      type: "file",
      name: rulesFile,
    });

    if (customRulesRaw) {
      let customRules = JSON.parse(customRulesRaw);
      const existingRules = new Set(config.route.rules.map(rule => JSON.stringify(rule)));
      customRules = customRules.filter(rule => !existingRules.has(JSON.stringify(rule)));

      const insertIndex = config.route.rules.findIndex(rule => rule.clash_mode === "global");
      if (customRules.length > 0) {
        if (insertIndex >= 0) {
          config.route.rules.splice(insertIndex + 1, 0, ...customRules);
        } else {
          config.route.rules.unshift(...customRules);
        }
      }
    }
  } catch (error) {
    // 自定义规则仅作增强，解析失败时忽略即可。
  }
}

// 3. 拉取订阅节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

const getNodeTag = node => node.tag || node.name || "";
const isJmsNode = node => /🧦|JMS/i.test(getNodeTag(node));
const isDmitNode = node => /⭕|DMIT/i.test(getNodeTag(node));
const isAzureNode = node => /azure/i.test(getNodeTag(node));
const isMjNode = node => /魔戒|MJ/i.test(getNodeTag(node));
const isLandingNode = node => /落地|landing|relay/i.test(getNodeTag(node));

// 4. 处理链式代理，优先把落地节点或特定单节点送入中转分组。
proxies = proxies.map(proxy => {
  const tag = getNodeTag(proxy);

  if (isLandingNode(proxy)) {
    proxy.detour = RELAY_TAG;
  }

  if (isDmitNode(proxy) && proxy.type === "shadowsocks") {
    proxy.detour = RELAY_TAG;
  }

  if (isAzureNode(proxy) && /日本|JP|Japan/i.test(tag) && proxy.type === "vless") {
    proxy.detour = RELAY_TAG;
  }

  return proxy;
});

// 5. 去重后注入所有节点，避免只注入部分节点导致分组缺口。
const existingTags = new Set(config.outbounds.map(outbound => outbound.tag));
proxies = proxies.filter(proxy => !existingTags.has(getNodeTag(proxy)));
config.outbounds.push(...proxies);

// 6. 提取分组所需 tag。
const jmsTags = proxies.filter(isJmsNode).map(getNodeTag);
const dmitTags = proxies.filter(isDmitNode).map(getNodeTag);
const azureTags = proxies.filter(isAzureNode).map(getNodeTag);
const mjTags = proxies.filter(isMjNode).map(getNodeTag);
const terminalTags = proxies.filter(proxy => !proxy.detour).map(getNodeTag);
const relayFrontTags = [...jmsTags, ...azureTags, ...mjTags];

const unique = list => [...new Set(list.filter(Boolean))];

// 7. 策略组填充。
config.outbounds.forEach(group => {
  if (!Array.isArray(group.outbounds)) {
    return;
  }

  switch (group.tag) {
    case "🧦 JMS机场":
      group.outbounds.push(...jmsTags);
      break;
    case "⭕ DMIT自建":
      group.outbounds.push(...dmitTags);
      break;
    case "☁️ Azure自建":
      group.outbounds.push(...azureTags);
      break;
    case "🪄 魔戒机场":
      group.outbounds.push(...mjTags);
      break;
    case RELAY_TAG:
      group.outbounds.push(
        DIRECT_TAG,
        ...(relayFrontTags.length > 0 ? relayFrontTags : terminalTags)
      );
      break;
    case "🛬 落地分组":
      group.outbounds.push(
        DIRECT_TAG,
        "⭕ DMIT自建",
        "🧦 JMS机场",
        "☁️ Azure自建",
        "🪄 魔戒机场",
        ...terminalTags
      );
      break;
    case "💳 PayPal":
      group.outbounds.push(
        DIRECT_TAG,
        "🚀 节点选择",
        "🛬 落地分组",
        "⭕ DMIT自建",
        "🧦 JMS机场",
        ...dmitTags
      );
      break;
    case "🚀 节点选择":
      group.outbounds.push(
        DIRECT_TAG,
        "🛬 落地分组",
        "🧦 JMS机场",
        "☁️ Azure自建",
        "⭕ DMIT自建",
        "🪄 魔戒机场",
        ...terminalTags
      );
      break;
    case "🤖 AI":
      group.outbounds.push(
        DIRECT_TAG,
        "🚀 节点选择",
        "🧦 JMS机场",
        "☁️ Azure自建",
        "⭕ DMIT自建",
        "🪄 魔戒机场",
        ...terminalTags
      );
      break;
    case "📥 Downloader":
      group.outbounds.push(
        DIRECT_TAG,
        "🚀 节点选择",
        "🛬 落地分组",
        "⭕ DMIT自建",
        "☁️ Azure自建",
        "🧦 JMS机场",
        "🪄 魔戒机场"
      );
      break;
    case "🎮 Game":
      group.outbounds.push(
        DIRECT_TAG,
        "🚀 节点选择",
        "🛬 落地分组",
        "⭕ DMIT自建",
        "☁️ Azure自建",
        "🧦 JMS机场",
        "🪄 魔戒机场"
      );
      break;
  }

  group.outbounds = unique(group.outbounds).filter(tag => tag !== group.tag);

  if (["selector", "urltest"].includes(group.type) && group.outbounds.length === 0) {
    group.outbounds = [DIRECT_TAG];
  }
});

$content = JSON.stringify(config, null, 2);