async function operator(proxies, targetPlatform, context) {
  const IP_TO_DOMAIN = {
    // "IP地址": "域名"
    // "1.2.3.4": "my-node.example.com"
  };

  return proxies.map(proxy => {
    const ip = proxy.server;
    if (ip && IP_TO_DOMAIN[ip]) {
      proxy.server = IP_TO_DOMAIN[ip];
    }
    return proxy;
  });
}
