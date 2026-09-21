function main(config) {
  // 基础防御
  if (!config) config = {};
  if (!Array.isArray(config.proxies)) config.proxies = [];

  // ==================== 基础设置 ====================
  config.mode = "rule";
  config["log-level"] = "warning";
  config.ipv6 = true;
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;

  // ==================== TUN + MIPS ====================
  config.tun = {
    enable: true,
    stack: "mips",
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": true,
    "dns-hijack": ["any:53"]
  };

  config.profile = {
    "store-selected": true,
    "store-fake-ip": true
  };

  // ==================== 优化版 DNS ====================
  config.dns = {
    enable: true,
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "respect-rules": true,

    "default-nameserver": [
      "223.5.5.5",
      "119.29.29.29",
      "1.1.1.1"
    ],

    nameserver: [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],

    "proxy-server-nameserver": [
      "223.5.5.5",
      "119.29.29.29"
    ],

    "direct-nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],

    "nameserver-policy": {
      "geosite:cn": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ],
      "geosite:private": "system"          // 内网域名走系统 DNS
    },

    fallback: [
      "https://dns.cloudflare.com/dns-query",
      "https://dns.google/dns-query"
    ],

    "fallback-filter": {
      geoip: true,
      "geoip-code": "CN",
      ipcidr: [
        "240.0.0.0/4",
        "0.0.0.0/32",
        "127.0.0.0/8"
      ]
    },

    "fake-ip-filter": [
      "*.lan",
      "*.local",
      "localhost",
      "*.msftconnecttest.com",
      "*.msftncsi.com",
      "captive.apple.com",
      "*.push.apple.com",
      "stun.*",
      "+.stun.*.*",
      "+.weixin.com",
      "+.wechat.com",
      "+.qq.com",
      "+.tencent.com"
    ]
  };

  // ==================== 策略组（完整空组防护） ====================
  const jpRegex = /🇯🇵|JP|Japan|日本|东京|大阪|千叶|成田/i;

  // 兼容节点为字符串或对象两种情况
  const hasJpNode = config.proxies.some(p => {
    const name = typeof p === "string" ? p : (p && p.name);
    return typeof name === "string" && jpRegex.test(name);
  });

  const jpGroup = {
    name: "日本节点",
    type: "url-test",
    "include-all": true,
    filter: "(?i)🇯🇵|JP|Japan|日本|东京|大阪|千叶|成田",
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 50,
    timeout: 3000,
    lazy: true,
    icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Japan.png"
  };

  // 没有日本节点时，关闭 include-all 并强制指定 DIRECT
  if (!hasJpNode) {
    jpGroup["include-all"] = false;
    jpGroup.proxies = ["DIRECT"];
  }

  config["proxy-groups"] = [
    {
      name: "节点选择",
      type: "select",
      proxies: ["日本节点", "手动选择", "DIRECT"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Final.png"
    },
    jpGroup,
    {
      name: "手动选择",
      type: "select",
      "include-all": true,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Global.png"
    }
  ];

  // ==================== 极简规则 ====================
  config.rules = [
    "DST-PORT,123,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",
    "GEOIP,lan,DIRECT,no-resolve",
    "GEOSITE,private,DIRECT",
    "GEOSITE,tiktok,日本节点",
    "GEOSITE,wechat,DIRECT",
    "DOMAIN-KEYWORD,testflight,节点选择",
    "GEOSITE,apple,DIRECT",
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "GEOSITE,geolocation-!cn,节点选择",
    "MATCH,节点选择"
  ];

  return config;
}
