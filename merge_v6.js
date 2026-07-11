const { name, type = "0", rules: rulesFile } = $arguments;

const DIRECT_TAG = "direct";

// 1. 读取模板
let config = JSON.parse($files[0]);

// 2. 插入自定义路由规则
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

      const insertIndex = config.route.rules.findIndex(rule => rule.clash_mode === "Global");
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
const isSoftbankNode = node => /JP-Softbank|Softbank|softbank/i.test(getNodeTag(node));
const isMjNode = node => /魔戒|MJ/i.test(getNodeTag(node));

// 4. 去除魔戒节点及重复后注入
const existingTags = new Set(config.outbounds.map(outbound => outbound.tag));
proxies = proxies.filter(proxy => !existingTags.has(getNodeTag(proxy)) && !isMjNode(proxy));
config.outbounds.push(...proxies);

// 5. 提取分组所需 tag
const jmsTags = proxies.filter(isJmsNode).map(getNodeTag);
const dmitTags = proxies.filter(isDmitNode).map(getNodeTag);
const azureTags = proxies.filter(isAzureNode).map(getNodeTag);
const softbankTags = proxies.filter(isSoftbankNode).map(getNodeTag);

const unique = list => [...new Set(list.filter(Boolean))];

// 6. 策略组填充
config.outbounds.forEach(group => {
  if (!Array.isArray(group.outbounds)) {
    return;
  }

  switch (group.tag) {
    case "♻️ 中转分组":
      group.outbounds.push(
        DIRECT_TAG,
        ...softbankTags,
        ...azureTags
      );
      break;
    case "🛬 落地分组":
      group.outbounds.push(
        DIRECT_TAG,
        ...jmsTags,
        ...dmitTags
      );
      break;
    case "🚀 节点选择":
      group.outbounds.push(
        DIRECT_TAG,
        ...dmitTags,
        ...azureTags,
        ...softbankTags,
        ...jmsTags
      );
      break;
    case "🤖 AI":
      group.outbounds.push(
        DIRECT_TAG,
        ...dmitTags,
        ...azureTags,
        ...softbankTags,
        ...jmsTags
      );
      break;
  }

  group.outbounds = unique(group.outbounds).filter(tag => tag !== group.tag);

  if (["selector", "urltest"].includes(group.type) && group.outbounds.length === 0) {
    group.outbounds = [DIRECT_TAG];
  }
});

$content = JSON.stringify(config, null, 2);
