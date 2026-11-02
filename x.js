// ========================================
// Clash 覆写脚本（日本节点精简精准优化版 v2）
// 自动最低延迟 + 日本旗帜图标 + 高精度分流 + DNS 防泄漏 + 广告拦截
// 适用：Clash Verge Rev / Mihomo Party / FlClash 等
// ========================================

function main(config) {
  // ========== 0. 基础安全与性能 ==========
  config.mode = "rule";
  config.ipv6 = false;
  config["allow-lan"] = false;
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;
  config["find-process-mode"] = "off";
  config["log-level"] = "warning";
  config["global-client-fingerprint"] = "chrome";
  config["geodata-mode"] = true;

  if (!config.profile) config.profile = {};
  config.profile["store-selected"] = true;
  config.profile["store-fake-ip"] = true;

  // ========== 1. DNS（隐私重点优化）==========
  config.dns = {
    enable: true,
    listen: "127.0.0.1:1053",          // 仅本机，更安全
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "prefer-h3": true,
    "use-hosts": true,
    "cache-algorithm": "arc",
    "respect-rules": true,             // 关键：遵循规则，更好防泄漏

    "fake-ip-filter": [
      "+.lan",
      "+.local",
      "+.localhost",
      "*.local",
      "localhost.ptlogin2.qq.com",
      "localhost.sec.qq.com",
      "localhost.work.weixin.qq.com",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "time.*.com",
      "time.*.gov",
      "time.*.edu.cn",
      "time.*.apple.com",
      "ntp.*.com",
      "+.market.xiaomi.com",
      "captive.apple.com",
      "guzzoni.apple.com",
      "workgroup"
    ],

    "default-nameserver": [
      "223.5.5.5",
      "119.29.29.29"
    ],

    "proxy-server-nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],

    nameserver: [
      "https://1.1.1.1/dns-query",
      "https://dns.google/dns-query"
    ],

    "nameserver-policy": {
      "geosite:cn,private,apple": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query",
        "223.5.5.5"
      ],
      "+.cn": [
        "https://dns.alidns.com/dns-query",
        "223.5.5.5"
      ],
      "geosite:geolocation-!cn": [
        "https://1.1.1.1/dns-query",
        "https://dns.google/dns-query"
      ]
    },

    fallback: [
      "https://1.1.1.1/dns-query",
      "https://dns.google/dns-query"
    ],
    "fallback-filter": {
      geoip: true,
      "geoip-code": "CN",
      geosite: ["gfw"],
      ipcidr: [
        "240.0.0.0/4",
        "0.0.0.0/32"
      ]
    }
  };

  // ========== 2. 节点过滤 + 日本重命名 ==========
  if (config.proxies && config.proxies.length > 0) {
    // 过滤垃圾信息节点
    config.proxies = config.proxies.filter(proxy => {
      const name = proxy.name || "";
      return !/(剩余|到期|套餐|流量|官网|通知|过期|重置|更新|网址|电报|TG|订阅)/i.test(name);
    });

    // 统一重命名（保留简单编号）
    config.proxies.forEach((proxy, index) => {
      const num = String(index + 1).padStart(2, "0");
      proxy.name = `日本 ${num}`;
    });
  }

  // ========== 3. 策略组（精简实用）==========
  const allProxies = (config.proxies || []).map(p => p.name);

  config["proxy-groups"] = [
    {
      name: "日本节点",
      type: "select",
      proxies: allProxies.length > 0 ? allProxies : ["DIRECT"],
      icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Japan.png"
    },
    {
      name: "AUTO",
      type: "url-test",
      proxies: allProxies.length > 0 ? allProxies : ["DIRECT"],
      url: "http://www.gstatic.com/generate_204",
      interval: 600,          // 10分钟测一次，更省流量
      tolerance: 50,
      lazy: true,
      timeout: 3000,
      icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Japan.png"
    },
    {
      name: "PROXY",
      type: "select",
      proxies: ["AUTO", "日本节点", "DIRECT"],
      icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/JP.png"
    }
  ];

  // ========== 4. 高精度远程规则集 (Meta 官方核心源) ==========
  config["rule-providers"] = {
    private: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs",
      path: "./ruleset/private.mrs",
      interval: 86400
    },
    cn: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs",
      path: "./ruleset/cn.mrs",
      interval: 86400
    },
    "cn-ip": {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs",
      path: "./ruleset/cn-ip.mrs",
      interval: 86400
    },
    "ads-all": {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ads-all.mrs",
      path: "./ruleset/ads-all.mrs",
      interval: 86400
    },
    tracker: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tracker.mrs",
      path: "./ruleset/tracker.mrs",
      interval: 86400
    },
    ai: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs",
      path: "./ruleset/ai.mrs",
      interval: 86400
    },
    gfw: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.mrs",
      path: "./ruleset/gfw.mrs",
      interval: 86400
    }
  };

  // ========== 5. 分流规则（精准防误判版）==========
  config.rules = [
    // 1. 局域网与私有地址直连
    "RULE-SET,private,DIRECT",

    // 2. PT / BT 下载走直连，保护流量与防风控
    "RULE-SET,tracker,DIRECT,no-resolve",

    // 3. 广告拦截（高优先级过滤垃圾弹窗）
    "RULE-SET,ads-all,REJECT",

    // 4. AI 服务走日本节点
    "RULE-SET,ai,AUTO",

    // 5. 常见海外主流平台（流媒体、社交、工具统一走日本自动节点）
    "GEOSITE,youtube,AUTO",
    "GEOSITE,netflix,AUTO",
    "GEOSITE,disney,AUTO",
    "GEOSITE,telegram,AUTO",
    "GEOSITE,github,AUTO",
    "GEOSITE,google,AUTO",

    // 6. 国内大厂及基础服务强制直连
    "RULE-SET,cn,DIRECT",
    "GEOSITE,apple,DIRECT",
    "GEOSITE,microsoft,DIRECT",
    "GEOSITE,bilibili,DIRECT",
    "GEOSITE,category-games@cn,DIRECT",   // 国内游戏直连

    // 7. GFW 列表与海外未中国化网站走代理
    "RULE-SET,gfw,AUTO",
    "GEOSITE,geolocation-!cn,AUTO",

    // 8. 国内 IP 兜底直连
    "RULE-SET,cn-ip,DIRECT,no-resolve",

    // 9. 最终兜底
    "MATCH,AUTO"
  ];

  // ========== 6. 嗅探（优化）==========
  config.sniffer = {
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": true,     // 开启后规则匹配更准确
    sniff: {
      TLS: {
        ports: [443, 8443]
      },
      HTTP: {
        ports: [80, 8080, 8880],
        "override-destination": true
      },
      QUIC: {
        ports: [443]
      }
    }
  };

  return config;
}
