// ========================================
// Clash 覆写脚本（对应小火箭无策略组版）
// 手动选节点 + 国内外分流 + DNS 防泄漏 + 节点干净重命名
// 适用：Clash Verge Rev / Mihomo Party / FlClash 等
// ========================================

function main(config) {
  // ========== 1. DNS 配置（防泄漏重点）==========
  config.dns = {
    enable: true,
    listen: "0.0.0.0:1053",
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
      "+.lan",
      "+.local",
      "+.localhost",
      "*.local",
      "localhost.ptlogin2.qq.com",
      "localhost.sec.qq.com",
      "localhost.work.weixin.qq.com",
      "+.msftconnecttest.com",
      "+.msftncsi.com"
    ],
    "default-nameserver": [
      "223.5.5.5",
      "119.29.29.29"
    ],
    nameserver: [
      "https://1.1.1.1/dns-query",
      "https://dns.google/dns-query"
    ],
    "nameserver-policy": {
      "geosite:cn": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query",
        "223.5.5.5"
      ],
      "geosite:private": [
        "223.5.5.5",
        "119.29.29.29"
      ],
      "+.cn": [
        "https://dns.alidns.com/dns-query",
        "223.5.5.5"
      ]
    },
    fallback: [
      "https://1.1.1.1/dns-query",
      "https://dns.google/dns-query"
    ],
    "fallback-filter": {
      geoip: true,
      "geoip-code": "CN",
      ipcidr: [
        "240.0.0.0/4",
        "0.0.0.0/32"
      ]
    },
    "proxy-server-nameserver": [
      "https://dns.alidns.com/dns-query",
      "223.5.5.5"
    ]
  };

  // ========== 2. 节点过滤 + 地区重命名 ==========
  if (config.proxies && config.proxies.length > 0) {
    const counter = {};

    // 过滤机场提示节点（剩余流量、到期、套餐等）
    config.proxies = config.proxies.filter(proxy => {
      const name = proxy.name || "";
      return !/(剩余|到期|套餐|流量|官网|通知)/.test(name);
    });

    // 地区识别 + 干净重命名（日本 01、香港 02...）
    config.proxies.forEach(proxy => {
      let region = "其他节点";
      const name = proxy.name || "";

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
      const index = String(counter[region]).padStart(2, "0");
      proxy.name = region + " " + index;
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

  // ========== 4. 规则 ==========
  config.rules = [
    // 局域网
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
    "GEOIP,private,DIRECT,no-resolve",

    // 明确需要代理的服务
    "DOMAIN-SUFFIX,openai.com,节点选择",
    "DOMAIN-SUFFIX,chatgpt.com,节点选择",
    "DOMAIN-SUFFIX,anthropic.com,节点选择",
    "DOMAIN-SUFFIX,claude.ai,节点选择",
    "DOMAIN-SUFFIX,gemini.google.com,节点选择",
    "DOMAIN-SUFFIX,googleapis.com,节点选择",
    "DOMAIN-SUFFIX,gstatic.com,节点选择",
    "DOMAIN-SUFFIX,youtube.com,节点选择",
    "DOMAIN-SUFFIX,googlevideo.com,节点选择",
    "DOMAIN-SUFFIX,github.com,节点选择",
    "DOMAIN-SUFFIX,githubusercontent.com,节点选择",
    "DOMAIN-SUFFIX,telegram.org,节点选择",
    "DOMAIN-SUFFIX,t.me,节点选择",
    "DOMAIN-KEYWORD,telegram,节点选择",

    // 国内高频直连
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

    // 国内大集合
    "GEOSITE,cn,DIRECT",
    "GEOSITE,apple,DIRECT",
    "GEOSITE,microsoft@cn,DIRECT",

    // IP 兜底
    "GEOIP,CN,DIRECT,no-resolve",

    // 最终兜底
    "MATCH,节点选择"
  ];

  // 开启嗅探
  config.sniffer = {
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": true,
    sniff: {
      TLS: {
        ports: [443, 8443]
      },
      HTTP: {
        ports: [80, 8080, 8880]
      }
    }
  };

  return config;
}
