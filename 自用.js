// ========================================
// Clash 覆写脚本（优化版）
// 手动选节点 + 精准国内外分流 + DNS 防泄漏 + 节点干净重命名
// 适用：Clash Verge Rev / Mihomo Party / FlClash 等支持 JS 覆写的客户端
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

    // 解析 DNS 服务器域名本身（必须国内可达）
    "default-nameserver": [
      "223.5.5.5",
      "119.29.29.29"
    ],

    // 代理节点域名解析（走国内加密 DNS，避免套娃）
    "proxy-server-nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query",
      "223.5.5.5"
    ],

    // 默认解析（国外域名走这里更干净）
    nameserver: [
      "https://1.1.1.1/dns-query",
      "https://dns.google/dns-query"
    ],

    // 国内 / 私有域名强制用国内 DoH（防污染 + 速度）
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

    // fallback 仅作为补充（fake-ip 模式下作用有限，保留即可）
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

  // ========== 2. 节点过滤 + 地区重命名 ==========
  if (config.proxies && config.proxies.length > 0) {
    const counter = {};

    // 过滤机场提示节点
    config.proxies = config.proxies.filter(proxy => {
      const name = proxy.name || "";
      return !/(剩余|到期|套餐|流量|官网|通知|过期|重置|更新|网址|电报|TG|订阅)/i.test(name);
    });

    // 地区识别 + 干净重命名
    config.proxies.forEach(proxy => {
      let region = "其他";
      const name = proxy.name || "";

      if (/(日本|NRT|KIX|JP|东京|大阪|Nagoya|Fukuoka)/i.test(name)) {
        region = "日本";
      } else if (/(香港|HK|Hong.?Kong)/i.test(name)) {
        region = "香港";
      } else if (/(台湾|TW|Taiwan|Taipei)/i.test(name)) {
        region = "台湾";
      } else if (/(美国|US|USA|United.?States|America|Los.?Angeles|San.?Jose|Seattle|Chicago|Dallas)/i.test(name)) {
        region = "美国";
      } else if (/(新加坡|SG|Singapore)/i.test(name)) {
        region = "新加坡";
      } else if (/(韩国|KR|Korea|Seoul)/i.test(name)) {
        region = "韩国";
      } else if (/(英国|UK|GB|London)/i.test(name)) {
        region = "英国";
      } else if (/(德国|DE|Frankfurt|Germany)/i.test(name)) {
        region = "德国";
      } else if (/(法国|FR|Paris|France)/i.test(name)) {
        region = "法国";
      } else if (/(加拿大|CA|Canada|Toronto|Montreal)/i.test(name)) {
        region = "加拿大";
      } else if (/(澳大利亚|AU|Australia|Sydney|Melbourne)/i.test(name)) {
        region = "澳大利亚";
      }

      counter[region] = (counter[region] || 0) + 1;
      const index = String(counter[region]).padStart(2, "0");
      proxy.name = `${region} ${index}`;
    });
  }

  // ========== 3. 只保留一个手动选择组 ==========
  const allProxies = (config.proxies || []).map(p => p.name);

  config["proxy-groups"] = [
    {
      name: "节点选择",
      type: "select",
      proxies: ["DIRECT", ...allProxies],
      icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png"
    }
  ];

  // ========== 4. 规则集（提升分流精度）==========
  config["rule-providers"] = {
    reject: {
      type: "http",
      behavior: "domain",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt",
      path: "./ruleset/reject.yaml",
      interval: 86400
    },
    proxy: {
      type: "http",
      behavior: "domain",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt",
      path: "./ruleset/proxy.yaml",
      interval: 86400
    },
    direct: {
      type: "http",
      behavior: "domain",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt",
      path: "./ruleset/direct.yaml",
      interval: 86400
    },
    private: {
      type: "http",
      behavior: "domain",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt",
      path: "./ruleset/private.yaml",
      interval: 86400
    },
    gfw: {
      type: "http",
      behavior: "domain",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt",
      path: "./ruleset/gfw.yaml",
      interval: 86400
    },
    "tld-not-cn": {
      type: "http",
      behavior: "domain",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt",
      path: "./ruleset/tld-not-cn.yaml",
      interval: 86400
    },
    telegramcidr: {
      type: "http",
      behavior: "ipcidr",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt",
      path: "./ruleset/telegramcidr.yaml",
      interval: 86400
    },
    cncidr: {
      type: "http",
      behavior: "ipcidr",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt",
      path: "./ruleset/cncidr.yaml",
      interval: 86400
    },
    lancidr: {
      type: "http",
      behavior: "ipcidr",
      url: "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/lancidr.txt",
      path: "./ruleset/lancidr.yaml",
      interval: 86400
    }
  };

  // ========== 5. 分流规则（顺序很重要）==========
  config.rules = [
    // --- 局域网 / 私有 ---
    "RULE-SET,private,DIRECT",
    "RULE-SET,lancidr,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
    "GEOIP,private,DIRECT,no-resolve",

    // --- 广告拦截 ---
    "RULE-SET,reject,REJECT",

    // --- 明确需要代理的服务（优先）---
    "DOMAIN-SUFFIX,openai.com,节点选择",
    "DOMAIN-SUFFIX,chatgpt.com,节点选择",
    "DOMAIN-SUFFIX,anthropic.com,节点选择",
    "DOMAIN-SUFFIX,claude.ai,节点选择",
    "DOMAIN-SUFFIX,gemini.google.com,节点选择",
    "DOMAIN-KEYWORD,openai,节点选择",
    "DOMAIN-SUFFIX,googleapis.com,节点选择",
    "DOMAIN-SUFFIX,gstatic.com,节点选择",
    "DOMAIN-SUFFIX,youtube.com,节点选择",
    "DOMAIN-SUFFIX,youtu.be,节点选择",
    "DOMAIN-SUFFIX,googlevideo.com,节点选择",
    "DOMAIN-SUFFIX,ytimg.com,节点选择",
    "DOMAIN-SUFFIX,github.com,节点选择",
    "DOMAIN-SUFFIX,githubusercontent.com,节点选择",
    "DOMAIN-SUFFIX,githubassets.com,节点选择",
    "DOMAIN-SUFFIX,telegram.org,节点选择",
    "DOMAIN-SUFFIX,t.me,节点选择",
    "DOMAIN-SUFFIX,telegra.ph,节点选择",
    "DOMAIN-KEYWORD,telegram,节点选择",
    "RULE-SET,telegramcidr,节点选择,no-resolve",

    // --- 国内高频直连（加速匹配）---
    "DOMAIN-SUFFIX,cn,DIRECT",
    "DOMAIN-SUFFIX,qq.com,DIRECT",
    "DOMAIN-SUFFIX,weixin.qq.com,DIRECT",
    "DOMAIN-SUFFIX,wechat.com,DIRECT",
    "DOMAIN-SUFFIX,tencent.com,DIRECT",
    "DOMAIN-SUFFIX,taobao.com,DIRECT",
    "DOMAIN-SUFFIX,tmall.com,DIRECT",
    "DOMAIN-SUFFIX,alipay.com,DIRECT",
    "DOMAIN-SUFFIX,aliyun.com,DIRECT",
    "DOMAIN-SUFFIX,alicdn.com,DIRECT",
    "DOMAIN-SUFFIX,baidu.com,DIRECT",
    "DOMAIN-SUFFIX,bilibili.com,DIRECT",
    "DOMAIN-SUFFIX,hdslb.com,DIRECT",
    "DOMAIN-SUFFIX,douyin.com,DIRECT",
    "DOMAIN-SUFFIX,bytedance.com,DIRECT",
    "DOMAIN-SUFFIX,jd.com,DIRECT",
    "DOMAIN-SUFFIX,meituan.com,DIRECT",
    "DOMAIN-SUFFIX,xiaohongshu.com,DIRECT",
    "DOMAIN-SUFFIX,zhihu.com,DIRECT",
    "DOMAIN-SUFFIX,163.com,DIRECT",
    "DOMAIN-SUFFIX,netease.com,DIRECT",
    "DOMAIN-SUFFIX,iqiyi.com,DIRECT",
    "DOMAIN-SUFFIX,youku.com,DIRECT",
    "DOMAIN-SUFFIX,kuaishou.com,DIRECT",
    "DOMAIN-SUFFIX,mi.com,DIRECT",
    "DOMAIN-SUFFIX,huawei.com,DIRECT",
    "DOMAIN-SUFFIX,apple.com,DIRECT",
    "DOMAIN-SUFFIX,icloud.com,DIRECT",
    "DOMAIN-SUFFIX,mzstatic.com,DIRECT",

    // --- 规则集分流 ---
    "RULE-SET,gfw,节点选择",
    "RULE-SET,tld-not-cn,节点选择",
    "RULE-SET,proxy,节点选择",
    "RULE-SET,direct,DIRECT",

    // --- Geo 兜底 ---
    "GEOSITE,cn,DIRECT",
    "GEOSITE,apple,DIRECT",
    "GEOSITE,microsoft@cn,DIRECT",
    "RULE-SET,cncidr,DIRECT,no-resolve",
    "GEOIP,CN,DIRECT,no-resolve",

    // --- 最终兜底 ---
    "MATCH,节点选择"
  ];

  // ========== 6. 嗅探 ==========
  config.sniffer = {
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": false,   // false 更稳，减少部分 App 异常
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
