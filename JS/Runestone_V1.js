function main(config) {
  // 基础防御
  if (!config) config = {};
  if (!Array.isArray(config.proxies)) config.proxies = [];

  // ==================== 1. 基础设置 ====================
  config.mode = "rule";
  config["log-level"] = "warning";
  config.ipv6 = false; // 与下方 dns.ipv6=false 保持一致，避免半启用状态
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;

  // ==================== 2. TUN 模式（已关闭） ====================
  config.tun = {
    enable: false
  };

  config.profile = {
    "store-selected": true,
    "store-fake-ip": true
  };

  // ==================== 3. 优化版 DNS ====================
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
      "geosite:private": "system"
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

  // ==================== 4. 节点过滤与重命名 ====================
  if (config.proxies.length > 0) {
    const counter = {};

    // 过滤机场提示节点
    config.proxies = config.proxies.filter(proxy => {
      const name = proxy.name || '';
      return !/(剩余|到期|套餐|流量|官网|通知)/.test(name);
    });

    // 节点地区识别与干净重命名
    config.proxies.forEach(proxy => {
      let region = "其他节点";
      const name = proxy.name || '';

      if (/(日本|NRT|KIX|JP|东京|大阪)/i.test(name)) {
        region = "日本";
      } else if (/(香港|HK)/i.test(name)) {
        region = "香港";
      } else if (/(台湾|TW)/i.test(name)) {
        region = "台湾";
      } else if (/(美国|US)/i.test(name)) {
        region = "美国";
      } else if (/(新加坡|SG)/i.test(name)) {
        region = "新加坡";
      }

      // 自动编号
      counter[region] = (counter[region] || 0) + 1;
      const index = String(counter[region]).padStart(2, '0');

      proxy.name = region + " " + index;
    });
  }

  // ==================== 5. 策略组配置 ====================
  config["proxy-groups"] = [
    {
      name: "节点选择",
      type: "select",
      proxies: ["自动选择", "AI策略", "日本节点", "手动选择", "DIRECT"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Final.png"
    },
    {
      name: "AI策略",
      type: "select",
      proxies: ["AI自动容灾", "日本节点", "手动选择"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Bot.png"
    },
    {
      name: "AI自动容灾",
      type: "fallback",
      "include-all": true,
      filter: "(?i)日本", // 补上地区过滤，确保只在日本节点间容灾，不受订阅变化影响
      url: "https://www.gstatic.com/generate_204",
      interval: 180,
      timeout: 3000,
      lazy: true,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Bot.png"
    },
    {
      name: "自动选择",
      type: "url-test",
      "include-all": true,
      url: "https://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      timeout: 3000,
      lazy: true,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/UrlTest.png"
    },
    {
      name: "日本节点",
      type: "url-test",
      "include-all": true,
      filter: "(?i)日本",
      url: "https://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      timeout: 3000,
      lazy: true,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Japan.png"
    },
    {
      name: "手动选择",
      type: "select",
      "include-all": true,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Global.png"
    }
  ];

  // ==================== 6. 分流规则 ====================
  config.rules = [
    // 基础局域网直连
    "DST-PORT,123,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",
    "GEOIP,lan,DIRECT,no-resolve",
    "GEOSITE,private,DIRECT",

    // AI 服务精准分流
    "DOMAIN,generativelanguage.googleapis.com,AI策略",
    "DOMAIN-KEYWORD,gemini,AI策略",
    "DOMAIN-KEYWORD,bard,AI策略",
    "GEOSITE,google-gemini,AI策略",
    "GEOSITE,openai,AI策略",
    "DOMAIN-KEYWORD,openai,AI策略",
    "DOMAIN-KEYWORD,chatgpt,AI策略",
    "GEOSITE,claude,AI策略",
    "DOMAIN-KEYWORD,claude,AI策略",
    "DOMAIN-KEYWORD,copilot,AI策略",

    // 指定服务与媒体刮削分流
    "DOMAIN-KEYWORD,tiktok,日本节点",
    "GEOSITE,tiktok,日本节点",
    "GEOSITE,telegram,节点选择",
    "GEOIP,telegram,节点选择,no-resolve",
    "GEOSITE,github,节点选择",
    "DOMAIN-KEYWORD,testflight,节点选择",
    "DOMAIN-KEYWORD,tmdb,节点选择",
    "DOMAIN-KEYWORD,themoviedb,节点选择",

    // 防谷歌送中：显式声明走代理，避免极端情况下无域名信息的连接被GEOIP,CN误判直连
    "GEOSITE,google,节点选择",

    // 国内应用与直连
    "GEOSITE,wechat,DIRECT",
    "DOMAIN-KEYWORD,servicewechat,DIRECT",
    "GEOSITE,apple,DIRECT",

    // 国内云厂商/CDN基础设施补充：覆盖未被geosite,cn收录的小众App，减少落入慢速GEOIP判断的概率
    "DOMAIN-SUFFIX,aliyuncs.com,DIRECT",
    "DOMAIN-SUFFIX,alicdn.com,DIRECT",
    "DOMAIN-SUFFIX,myqcloud.com,DIRECT",
    "DOMAIN-SUFFIX,gtimg.com,DIRECT",
    "DOMAIN-SUFFIX,qpic.cn,DIRECT",
    "DOMAIN-SUFFIX,bdstatic.com,DIRECT",
    "DOMAIN-SUFFIX,bdimg.com,DIRECT",
    "DOMAIN-SUFFIX,baidubce.com,DIRECT",
    "DOMAIN-SUFFIX,byteimg.com,DIRECT",
    "DOMAIN-SUFFIX,volces.com,DIRECT",
    "DOMAIN-SUFFIX,hdslb.com,DIRECT",
    "DOMAIN-SUFFIX,qiniucdn.com,DIRECT",
    "DOMAIN-SUFFIX,clouddn.com,DIRECT",
    "DOMAIN-SUFFIX,upyun.com,DIRECT",
    "DOMAIN-SUFFIX,wscdns.com,DIRECT",
    "DOMAIN-SUFFIX,wscloudcdn.com,DIRECT",
    "DOMAIN-SUFFIX,ksyun.com,DIRECT",

    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",

    // 海外兜底
    "GEOSITE,geolocation-!cn,节点选择",
    "MATCH,节点选择"
  ];

  return config;
}
