const { name, type = "0" } = $arguments;

// 1. 读取模板
let config = JSON.parse($files[0]);

// 2. 拉取订阅节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 3. 节点分类
const dkNodes = proxies.filter(p => /🚢/.test(p.tag));
const jmsNodes = proxies.filter(p => /🧦/.test(p.tag));
const dmitNodes = proxies.filter(p => /⭕/.test(p.tag));
const azureNodes = proxies.filter(p => /azure/i.test(p.tag));
const gcpNodes = proxies.filter(p => (p.subName && p.subName.includes('GCP')) || /GCP/i.test(p.tag));
const mjNodes = proxies.filter(p => /魔戒/.test(p.tag));

// 4. 处理链式代理：DMIT SS 和 GCP SS -> 中转
dmitNodes.forEach(node => {
  if (node.type === 'shadowsocks') {
    node.detour = "♻️ 中转分组";
  }
});

gcpNodes.forEach(node => {
  if (node.type === 'shadowsocks') {
    node.detour = "♻️ 中转分组";
  }
});

// 5. 注入节点到 Outbounds
const existingTags = config.outbounds.map(o => o.tag);
const allNewProxies = [...dkNodes, ...jmsNodes, ...dmitNodes, ...azureNodes, ...gcpNodes, ...mjNodes];
const uniqueProxies = allNewProxies.filter(p => !existingTags.includes(p.tag));
config.outbounds.push(...uniqueProxies);

// 6. 提取 Tag 列表
const dkTags = dkNodes.map(p => p.tag);
const jmsTags = jmsNodes.map(p => p.tag);
const dmitTags = dmitNodes.map(p => p.tag);
const azureTags = azureNodes.map(p => p.tag);
const gcpTags = gcpNodes.map(p => p.tag);
const mjTags = mjNodes.map(p => p.tag);
// 提取单节点 (不含组)
const singleNodeTags = [...dmitTags, ...azureTags, ...gcpTags, ...mjTags];

// 7. 策略组填充
config.outbounds.forEach(group => {
  switch (group.tag) {
    case "🚢 DK机场":
      group.outbounds.push(...dkTags);
      break;
    case "🧦 JMS机场":
      group.outbounds.push(...jmsTags);
      break;
    case "⭕ DMIT自建":
      group.outbounds.push(...dmitTags);
      break;
    case "☁️ Azure自建":
      group.outbounds.push(...azureTags);
      break;
    case "☁️ GCP台湾":
      group.outbounds.push(...gcpTags);
      break;

    case "🪄 魔戒机场":
      group.outbounds.push(...mjTags);
      break;

    case "♻️ 中转分组":
      // 包含 DK, JMS, Azure, 魔戒的所有节点
      group.outbounds.push(...dkTags, ...jmsTags, ...azureTags, ...mjTags);
      break;

    case "💳 PayPal":
      // 包含 DMIT, JMS, 直连
      group.outbounds.push(...dmitTags, ...jmsTags, "🎯 全球直连");
      break;

    case "🚀 节点选择":
      // 包含 所有的策略组 + 单节点
      group.outbounds.push(
        "🚢 DK机场",
        "🧦 JMS机场",
        "☁️ Azure自建",
        "☁️ GCP台湾",
        "⭕ DMIT自建",
        "🪄 魔戒机场",
        ...singleNodeTags
      );
      break;

    case "🤖 AI":
      // 包含 所有的策略组 + 单节点 + 节点选择
      group.outbounds.push(
        "🚢 DK机场",
        "🧦 JMS机场",
        "☁️ Azure自建",
        "☁️ GCP台湾",
        "⭕ DMIT自建",
        "🪄 魔戒机场",
        ...singleNodeTags,
        "🚀 节点选择"
      );
      break;

    case "📥 Downloader":
    case "🎮 Game":
      // 包含 直连, 节点选择, 以及所有主要分组
      group.outbounds.push(
        "🎯 全球直连",
        "🚀 节点选择",
        "⭕ DMIT自建",
        "☁️ Azure自建",
        "☁️ GCP台湾",
        "🧦 JMS机场",
        "🪄 魔戒机场"
      );
      break;
  }
});

// 8. 组内去重
config.outbounds.forEach(group => {
  if (Array.isArray(group.outbounds)) {
    group.outbounds = [...new Set(group.outbounds)];
  }

  // 防止策略组由于某些原因空载导致 sing-box 崩溃报错 `missing tags`
  if (!group.outbounds || group.outbounds.length === 0) {
    if (group.tag !== "🎯 全球直连" && group.type !== "direct") {
      group.outbounds = ["🎯 全球直连"];
    }
  }
});

$content = JSON.stringify(config, null, 2);