/*
 * 极致精简版 JS 覆写脚本 V1
 *
 * 逻辑：
 * 1. 继承机场订阅解析出来的所有节点 (config.proxies)。
 * 2. 覆盖原有的复杂分流，只保留“日本节点自动优选”与“国内直连”。
 * 3. 剩余所有海外流量（Google, YouTube, Gemini, TikTok 等）全部默认走日本节点。
 */

function main(config) {
  // 1. 提取机场订阅解析后的动态节点
  const proxies = Array.isArray(config && config.proxies) ? config.proxies : [];

  // 2. 极简固定配置
  const fixed = {
    "mixed-port": 7890,
    "allow-lan": false,
    "bind-address": "*",
    "mode": "rule",
    "log-level": "info",
    "external-controller": "127.0.0.1:9090",
    "unified-delay": true,
    "tcp-concurrent": true,
    "ipv6": false,
    "tun": {
      "enable": true,
      "stack": "gvisor",
      "auto-route": true,
      "auto-detect-interface": true,
      "strict-route": true,
      "dns-hijack": ["any:53"]
    },
    "dns": {
      "enable": true,
      "respect-rules": true,
      "ipv6": false,
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "default-nameserver": ["223.5.5.5", "119.29.29.29"],
      "nameserver": [
        "https://dns.google/dns-query",
        "https://1.1.1.1/dns-query"
      ],
      "direct-nameserver": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ],
      "fake-ip-filter": [
        "*.lan",
        "*.local",
        "localhost",
        "*.msftconnecttest.com",
        "*.msftncsi.com",
        "captive.apple.com",
        "+.weixin.com",
        "+.wechat.com"
      ]
    },
    "profile": {
      "store-selected": true,
      "store-fake-ip": true
    },
    
    // ==================== 策略组（极简化） ====================
    "proxy-groups": [
      {
        "name": "节点选择",
        "type": "select",
        "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Global.png",
        "proxies": ["🇯🇵 JP-Auto", "⚡ 自动选择", "DIRECT"]
      },
      {
        "name": "🇯🇵 JP-Auto",
        "type": "url-test",
        "include-all": true,
        "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Japan.png",
        "filter": "(?i)(\\[JP\\]|^JP$|Japan|\\bJP\\b|日本|东京|大阪|🇯🇵)",
        "url": "http://www.gstatic.com/generate_204",
        "interval": 600,
        "tolerance": 100
      },
      {
        "name": "⚡ 自动选择",
        "type": "url-test",
        "include-all": true,
        "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Auto.png",
        "filter": "^(?!.*(官网|到期|流量|倍率|剩余|重置|客服|群)).*",
        "url": "http://www.gstatic.com/generate_204",
        "interval": 600,
        "tolerance": 100
      }
    ],

    // ==================== 分流规则（极简化） ====================
    "rules": [
      // 1. 局域网直连
      "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
      "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
      "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
      "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
      "GEOIP,LAN,DIRECT,no-resolve",

      // 2. 国内服务与国内 IP 直连
      "RULE-SET,ChinaMax,DIRECT",
      "GEOSITE,CN,DIRECT",
      "GEOIP,CN,DIRECT,no-resolve",

      // 3. 所有剩余流量（含 Gemini, TikTok, 油管等）全部走日本节点出口
      "MATCH,节点选择"
    ],

    // ==================== 规则集定义 ====================
    "rule-providers": {
      "ChinaMax": {
        "type": "http",
        "behavior": "classical",
        "format": "yaml",
        "interval": 86400,
        "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/ChinaMax/ChinaMax.yaml"
      }
    }
  };

  // 3. 注入机场节点
  fixed.proxies = proxies;

  // 4. 清理多余字段
  delete fixed["proxy-providers"];

  return fixed;
}
