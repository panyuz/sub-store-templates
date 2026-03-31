function operator(proxies) {
  return proxies.map(node => {
    // 落地节点 -> 中转
    if (/落地/.test(node.name)) {
      node.detour = "♻️ 中转分组";
    }

    // 日本 Azure VLESS 节点 -> 中转
    if (/azure/i.test(node.name) && /日本|JP|Japan/i.test(node.name) && node.type === 'vless') {
      node.detour = "♻️ 中转分组";
    }

    return node;
  });
}
