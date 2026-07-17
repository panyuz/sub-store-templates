async function operator(proxies, targetPlatform, context) {
  const SINGBOX_PATH = "/usr/local/bin/sing-box";
  
  return proxies.map(proxy => {
    // 将 external 类型的执行程序从 mihomo 改为 sing-box
    if (proxy._exec || proxy.type === "external") {
      proxy._exec = SINGBOX_PATH;
    }
    return proxy;
  });
}
