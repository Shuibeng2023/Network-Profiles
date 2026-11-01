// ========================================
// Clash 覆写脚本（日本节点精简优化版）
// 自动最低延迟 + 日本旗帜图标 + 精准分流 + DNS 防泄漏
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

  if (!config.profile) config.profile = {};
  config.profile["store-selected"] = true;
  config.profile["store-fake-ip"] = true;

  // ========== 1. DNS（隐私重点）==========
  config.dns = {
    enable: true,
    listen: "0.0.0.0:1053",
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "prefer-h3": true,
    "use-hosts": true,
    "cache-algorithm": "arc",

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
      "https://doh.pub/dns-query",
      "223.5.5.5"
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
    // 过滤掉无关节点
    config.proxies = config.proxies.filter(proxy => {
      const name = proxy.name || "";
      return !/(剩余|到期|套餐|流量|官网|通知|过期|重置|更新|网址|电报|TG|订阅)/i.test(name);
    });

    // 统一重命名为 日本 01、日本 02...
    config.proxies.forEach((proxy, index) => {
      const num = String(index + 1).padStart(2, "0");
      proxy.name = `日本 ${num}`;
    });
  }

  // ========== 3. 策略组（精简 + 日本旗帜）==========
  const allProxies = (config.proxies || []).map(p => p.name);

  config["proxy-groups"] = [
    {
      name: "AUTO",
      type: "url-test",
      proxies: allProxies.length > 0 ? allProxies : ["DIRECT"],
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      lazy: true,
      timeout: 3000,
      icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Japan.png"
    },
    {
      name: "PROXY",
      type: "select",
      proxies: ["AUTO", "DIRECT", ...allProxies],
      icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/JP.png"
    }
  ];

  // ========== 4. 规则集 ==========
  config["rule-providers"] = {
    private: {
      type: "http",
      behavior: "domain",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt",
      path: "./ruleset/private.yaml",
      interval: 86400
    }
  };

  // ========== 5. 分流规则（最终优化版）==========
  config.rules = [
    // 局域网 + 基础
    "DST-PORT,123,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",
    "GEOSITE,private,DIRECT",

    // AI
    "GEOSITE,category-ai-!cn,PROXY",

    // 油管、奈飞等
    "GEOSITE,youtube,AUTO",
    "GEOSITE,netflix,AUTO",
    "GEOIP,netflix,AUTO,no-resolve",
    "GEOSITE,disney,AUTO",
    "GEOSITE,hbo,AUTO",
    "GEOSITE,primevideo,AUTO",
    "GEOSITE,hulu,AUTO",
    "GEOSITE,spotify,AUTO",
    "GEOSITE,tiktok,AUTO",
    "GEOSITE,twitch,AUTO",
    "GEOSITE,bahamut,AUTO",
    "GEOSITE,biliintl,AUTO",
    "GEOSITE,telegram,AUTO",
    "GEOIP,telegram,AUTO,no-resolve",

    // 游戏
    "GEOSITE,steam,AUTO",
    "GEOSITE,epicgames,AUTO",
    "GEOSITE,nintendo,AUTO",
    "GEOSITE,sony,AUTO",
    "GEOSITE,origin,AUTO",

    // 开发
    "GEOSITE,github,AUTO",

    // 苹果 / 微软 / B站
    "GEOSITE,apple,DIRECT",
    "GEOSITE,microsoft,DIRECT",
    "GEOSITE,bilibili,DIRECT",

    // Google 推送
    "GEOSITE,googlefcm,AUTO",

    // ========== 国内直连加强 ==========
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT",
    "GEOSITE,alibaba,DIRECT",
    "GEOSITE,tencent,DIRECT",
    "GEOSITE,bytedance,DIRECT",
    "GEOSITE,baidu,DIRECT",
    "GEOSITE,netease,DIRECT",
    "GEOSITE,jd,DIRECT",
    "GEOSITE,meituan,DIRECT",
    "GEOSITE,pinduoduo,DIRECT",
    "GEOSITE,kuaishou,DIRECT",
    "GEOSITE,iqiyi,DIRECT",
    "GEOSITE,youku,DIRECT",
    "GEOSITE,xiaohongshu,DIRECT",
    "GEOSITE,douyin,DIRECT",
    "GEOSITE,zhihu,DIRECT",
    "GEOSITE,weibo,DIRECT",
    "GEOSITE,category-games@cn,DIRECT",

    // 最终规则
    "GEOSITE,geolocation-!cn,AUTO",
    "MATCH,AUTO"
  ];

  // ========== 6. 嗅探 ==========
  config.sniffer = {
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": false,
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
