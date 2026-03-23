---
title: 裸 Ubuntu 机器上用 Docker 搭建 Prometheus + Grafana + Alertmanager + 飞书机器人监控栈
slug: ubuntu-docker-prometheus-grafana-alertmanager-feishu-monitoring
excerpt: 从 Docker 安装、镜像加速、容器编排到 Prometheus 采集、Grafana 展示、Alertmanager 告警路由、飞书机器人转发，完整监控本机系统、Redis、MongoDB 与本机指定端口服务。
category: 运维实践
tags: ubuntu, docker, prometheus, grafana, alertmanager, 飞书, redis, mongodb, blackbox
status: PUBLISHED
featured: false
pinned: false
publishedAt: 2026-03-23T15:30:00+08:00
---

## 这篇文章要解决什么问题

很多人第一次在一台裸 Ubuntu 机器上搭监控，会遇到几个典型问题：

1. Docker 装好了，但镜像拉不动，或者 Compose 不知道怎么配。
2. Prometheus 能起来，但只监控到了自己，没有监控到宿主机、Redis、MongoDB。
3. Grafana 能打开，但数据源、告警、面板都要手工点，很容易漏。
4. Alertmanager 能发 webhook，但飞书机器人吃不下原始告警格式。
5. 想监控本机一个指定端口服务，比如 `127.0.0.1:8080` 或 `127.0.0.1:9000`，却不知道该用什么 exporter。

这篇文章给一套可以直接落地的做法：

- 用 `node-exporter` 监控宿主机 CPU、内存、磁盘、负载
- 用 `redis_exporter` 监控本机 Redis
- 用 `mongodb_exporter` 监控本机 MongoDB
- 用 `blackbox_exporter` 监控本机指定 HTTP 端口和纯 TCP 端口
- 用 Prometheus 统一采集
- 用 Grafana 展示
- 用 Alertmanager 统一告警路由
- 用一个我们自己写的轻量飞书 webhook 转发器，把 Alertmanager 告警转成飞书机器人能识别的消息格式

## 最终架构

```text
+-------------------+        scrape         +----------------------+
|    Prometheus     | -------------------> |    node-exporter     |
+-------------------+                      +----------------------+
         |                                  scrape host metrics
         |
         | ------------------------------> +----------------------+
         |                                 |    redis_exporter    |
         |                                 +----------------------+
         |
         | ------------------------------> +----------------------+
         |                                 |   mongodb_exporter   |
         |                                 +----------------------+
         |
         | ------------------------------> +----------------------+
         |                                 |  blackbox_exporter   |
         |                                 +----------------------+
         |
         | fire alerts
         v
+-------------------+    webhook    +----------------------+
|   Alertmanager    | ------------> |    feishu-relay      |
+-------------------+               +----------------------+
                                              |
                                              | POST
                                              v
                                      +------------------+
                                      |  飞书自定义机器人  |
                                      +------------------+

+-------------------+
|     Grafana       |
+-------------------+
         |
         | query
         v
+-------------------+
|    Prometheus     |
+-------------------+
```

## 环境约定

本文默认你有一台公网或内网可访问的 Ubuntu 机器，推荐：

- Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS
- 具备 `sudo` 权限
- Redis 跑在宿主机 `127.0.0.1:6379`
- MongoDB 跑在宿主机 `127.0.0.1:27017`
- 你还想额外监控一个 HTTP 服务 `127.0.0.1:8080`
- 以及一个纯 TCP 服务 `127.0.0.1:9000`

如果你的端口不是这些，后面改成自己的就行。

为了让目录清晰，我们统一把监控文件放到：

```bash
/opt/monitoring
```

## 第 1 步：安装 Docker Engine 和 Docker Compose Plugin

下面这套安装方式走的是 Docker 官方 `apt` 仓库，适合 Ubuntu 22.04 和 24.04。

先卸载可能冲突的旧包：

```bash
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  sudo apt-get remove -y $pkg
done
```

安装基础依赖：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
```

添加 Docker 官方 GPG Key：

```bash
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

写入 Docker 仓库：

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

安装 Docker Engine、Buildx、Compose Plugin：

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

启动并设置开机自启：

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

把当前用户加入 `docker` 组，避免每次都 `sudo`：

```bash
sudo usermod -aG docker $USER
newgrp docker
```

检查版本：

```bash
docker version
docker compose version
```

## 第 2 步：配置 Docker 镜像加速和日志策略

如果你在国内机器上部署，强烈建议配置镜像加速。这里给一个 `daemon.json` 模板，`registry-mirrors` 里的地址请替换成你自己可用的镜像加速地址。

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "exec-opts": [
    "native.cgroupdriver=systemd"
  ]
}
EOF
```

重载并重启 Docker：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
docker info
```

如果 `docker info` 输出里能看到 `Registry Mirrors`，说明生效了。

## 第 3 步：创建监控目录结构

```bash
sudo mkdir -p /opt/monitoring/prometheus/rules
sudo mkdir -p /opt/monitoring/alertmanager
sudo mkdir -p /opt/monitoring/blackbox
sudo mkdir -p /opt/monitoring/grafana/provisioning/datasources
sudo mkdir -p /opt/monitoring/feishu-relay
sudo chown -R $USER:$USER /opt/monitoring

cd /opt/monitoring
```

建议最终目录长这样：

```text
/opt/monitoring
├── docker-compose.yml
├── .env
├── alertmanager
│   └── alertmanager.yml
├── blackbox
│   └── blackbox.yml
├── feishu-relay
│   ├── app.py
│   └── Dockerfile
├── grafana
│   └── provisioning
│       └── datasources
│           └── prometheus.yml
└── prometheus
    ├── prometheus.yml
    └── rules
        └── host-services-alerts.yml
```

## 第 4 步：准备环境变量

先创建 `.env`：

```bash
cat > /opt/monitoring/.env <<'EOF'
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=ChangeMe_123456

# 飞书机器人 webhook 地址，去飞书群里添加自定义机器人后获取
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-token

# 如果飞书机器人开启了签名校验，就填这个；没开可以留空
FEISHU_SECRET=

# Redis 连接串
REDIS_ADDR=redis://host.docker.internal:6379

# MongoDB 连接串
MONGODB_URI=mongodb://host.docker.internal:27017/admin
EOF
```

如果 Redis 有密码，例如密码是 `redis123`，就把：

```text
REDIS_ADDR=redis://host.docker.internal:6379
```

改成：

```text
REDIS_ADDR=redis://:redis123@host.docker.internal:6379
```

如果 MongoDB 开了认证，例如：

- 用户名：`monitor`
- 密码：`monitor123`
- 认证库：`admin`

那就把：

```text
MONGODB_URI=mongodb://host.docker.internal:27017/admin
```

改成：

```text
MONGODB_URI=mongodb://monitor:monitor123@host.docker.internal:27017/admin
```

## 第 5 步：编写 docker-compose.yml

下面这份 Compose 是整套监控的核心。

```yaml
services:
  prometheus:
    image: prom/prometheus
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=15d"
      - "--web.enable-lifecycle"
    depends_on:
      - node-exporter
      - redis-exporter
      - mongodb-exporter
      - blackbox-exporter
      - alertmanager

  grafana:
    image: grafana/grafana
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    command:
      - "--config.file=/etc/alertmanager/alertmanager.yml"
      - "--storage.path=/alertmanager"

  node-exporter:
    image: prom/node-exporter
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--path.rootfs=/rootfs"
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/.+)($|/)"

  redis-exporter:
    image: oliver006/redis_exporter
    container_name: redis-exporter
    restart: unless-stopped
    ports:
      - "9121:9121"
    env_file:
      - .env
    environment:
      REDIS_ADDR: ${REDIS_ADDR}
    extra_hosts:
      - "host.docker.internal:host-gateway"

  mongodb-exporter:
    image: percona/mongodb_exporter
    container_name: mongodb-exporter
    restart: unless-stopped
    ports:
      - "9216:9216"
    env_file:
      - .env
    command:
      - "--mongodb.uri=${MONGODB_URI}"
      - "--collect-all"
    extra_hosts:
      - "host.docker.internal:host-gateway"

  blackbox-exporter:
    image: prom/blackbox-exporter
    container_name: blackbox-exporter
    restart: unless-stopped
    ports:
      - "9115:9115"
    volumes:
      - ./blackbox/blackbox.yml:/etc/blackbox_exporter/config.yml:ro
    command:
      - "--config.file=/etc/blackbox_exporter/config.yml"
    extra_hosts:
      - "host.docker.internal:host-gateway"

  feishu-relay:
    build:
      context: ./feishu-relay
    container_name: feishu-relay
    restart: unless-stopped
    ports:
      - "18080:8080"
    env_file:
      - .env

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

把上面内容写入文件：

```bash
cat > /opt/monitoring/docker-compose.yml <<'EOF'
services:
  prometheus:
    image: prom/prometheus
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=15d"
      - "--web.enable-lifecycle"
    depends_on:
      - node-exporter
      - redis-exporter
      - mongodb-exporter
      - blackbox-exporter
      - alertmanager

  grafana:
    image: grafana/grafana
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    command:
      - "--config.file=/etc/alertmanager/alertmanager.yml"
      - "--storage.path=/alertmanager"

  node-exporter:
    image: prom/node-exporter
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--path.rootfs=/rootfs"
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/.+)($|/)"

  redis-exporter:
    image: oliver006/redis_exporter
    container_name: redis-exporter
    restart: unless-stopped
    ports:
      - "9121:9121"
    env_file:
      - .env
    environment:
      REDIS_ADDR: ${REDIS_ADDR}
    extra_hosts:
      - "host.docker.internal:host-gateway"

  mongodb-exporter:
    image: percona/mongodb_exporter
    container_name: mongodb-exporter
    restart: unless-stopped
    ports:
      - "9216:9216"
    env_file:
      - .env
    command:
      - "--mongodb.uri=${MONGODB_URI}"
      - "--collect-all"
    extra_hosts:
      - "host.docker.internal:host-gateway"

  blackbox-exporter:
    image: prom/blackbox-exporter
    container_name: blackbox-exporter
    restart: unless-stopped
    ports:
      - "9115:9115"
    volumes:
      - ./blackbox/blackbox.yml:/etc/blackbox_exporter/config.yml:ro
    command:
      - "--config.file=/etc/blackbox_exporter/config.yml"
    extra_hosts:
      - "host.docker.internal:host-gateway"

  feishu-relay:
    build:
      context: ./feishu-relay
    container_name: feishu-relay
    restart: unless-stopped
    ports:
      - "18080:8080"
    env_file:
      - .env

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
EOF
```

## 第 6 步：编写 Prometheus 配置

Prometheus 要做两件事：

1. 定时抓取各类 exporter 指标
2. 加载告警规则，并把告警发给 Alertmanager

### 6.1 `prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/rules/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets:
          - prometheus:9090

  - job_name: node-exporter
    static_configs:
      - targets:
          - node-exporter:9100

  - job_name: redis-exporter
    static_configs:
      - targets:
          - redis-exporter:9121

  - job_name: mongodb-exporter
    static_configs:
      - targets:
          - mongodb-exporter:9216

  - job_name: blackbox-http
    metrics_path: /probe
    params:
      module:
        - http_2xx_local
    static_configs:
      - targets:
          - http://host.docker.internal:8080/health
          - http://host.docker.internal:8080/
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: blackbox-tcp
    metrics_path: /probe
    params:
      module:
        - tcp_connect_local
    static_configs:
      - targets:
          - host.docker.internal:9000
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

写入文件：

```bash
cat > /opt/monitoring/prometheus/prometheus.yml <<'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/rules/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets:
          - prometheus:9090

  - job_name: node-exporter
    static_configs:
      - targets:
          - node-exporter:9100

  - job_name: redis-exporter
    static_configs:
      - targets:
          - redis-exporter:9121

  - job_name: mongodb-exporter
    static_configs:
      - targets:
          - mongodb-exporter:9216

  - job_name: blackbox-http
    metrics_path: /probe
    params:
      module:
        - http_2xx_local
    static_configs:
      - targets:
          - http://host.docker.internal:8080/health
          - http://host.docker.internal:8080/
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: blackbox-tcp
    metrics_path: /probe
    params:
      module:
        - tcp_connect_local
    static_configs:
      - targets:
          - host.docker.internal:9000
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
EOF
```

### 6.2 本机指定端口服务怎么加

如果你还想多监控两个本机 HTTP 服务：

- `127.0.0.1:7001`
- `127.0.0.1:7002`

那就在 `blackbox-http` 的 `targets` 里继续加：

```yaml
  - job_name: blackbox-http
    metrics_path: /probe
    params:
      module:
        - http_2xx_local
    static_configs:
      - targets:
          - http://host.docker.internal:7001/health
          - http://host.docker.internal:7002/health
```

如果你要监控纯 TCP 端口，比如：

- `3306`
- `5672`

那就在 `blackbox-tcp` 的 `targets` 里继续加：

```yaml
  - job_name: blackbox-tcp
    metrics_path: /probe
    params:
      module:
        - tcp_connect_local
    static_configs:
      - targets:
          - host.docker.internal:3306
          - host.docker.internal:5672
```

## 第 7 步：编写 Blackbox Exporter 配置

`blackbox_exporter` 用来探测服务是否可访问，不关心应用内部细节，只关心：

- HTTP 是否返回 2xx
- TCP 端口能不能连上
- 响应时间是否过高

```yaml
modules:
  http_2xx_local:
    prober: http
    timeout: 5s
    http:
      method: GET
      preferred_ip_protocol: ip4
      valid_http_versions: ["HTTP/1.1", "HTTP/2"]

  tcp_connect_local:
    prober: tcp
    timeout: 5s
    tcp:
      preferred_ip_protocol: ip4
```

写入文件：

```bash
cat > /opt/monitoring/blackbox/blackbox.yml <<'EOF'
modules:
  http_2xx_local:
    prober: http
    timeout: 5s
    http:
      method: GET
      preferred_ip_protocol: ip4
      valid_http_versions: ["HTTP/1.1", "HTTP/2"]

  tcp_connect_local:
    prober: tcp
    timeout: 5s
    tcp:
      preferred_ip_protocol: ip4
EOF
```

## 第 8 步：编写 Prometheus 告警规则

下面这套规则覆盖了几个最常见场景：

- 宿主机不可达
- CPU 持续偏高
- 内存可用率过低
- 根分区磁盘空间不足
- Redis exporter 挂了
- Redis 实例不可达
- MongoDB exporter 挂了
- MongoDB 实例不可达
- HTTP 服务不可达
- TCP 端口不可达
- HTTP 服务响应时间过高

```yaml
groups:
  - name: host-services-alerts
    rules:
      - alert: HostDown
        expr: up{job="node-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "宿主机监控不可达"
          description: "Prometheus 已连续 1 分钟无法抓取 node-exporter。"

      - alert: HostHighCpuLoad
        expr: (1 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "宿主机 CPU 使用率过高"
          description: "实例 {{ $labels.instance }} 的 CPU 使用率连续 10 分钟高于 85%，当前值 {{ printf \"%.2f\" $value }}%。"

      - alert: HostMemoryLow
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 < 15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "宿主机可用内存不足"
          description: "实例 {{ $labels.instance }} 可用内存低于 15%，当前值 {{ printf \"%.2f\" $value }}%。"

      - alert: HostDiskRootLow
        expr: (node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}) * 100 < 15
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "根分区磁盘可用空间不足"
          description: "实例 {{ $labels.instance }} 根分区可用空间低于 15%，当前值 {{ printf \"%.2f\" $value }}%。"

      - alert: RedisExporterDown
        expr: up{job="redis-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis Exporter 不可达"
          description: "Prometheus 无法抓取 redis-exporter 指标。"

      - alert: RedisInstanceDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis 实例不可达"
          description: "redis_exporter 可以访问，但 Redis 实例连接失败。"

      - alert: MongoExporterDown
        expr: up{job="mongodb-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB Exporter 不可达"
          description: "Prometheus 无法抓取 mongodb-exporter 指标。"

      - alert: MongoInstanceDown
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB 实例不可达"
          description: "mongodb_exporter 可以访问，但 MongoDB 实例连接失败。"

      - alert: HttpServiceDown
        expr: probe_success{job="blackbox-http"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "HTTP 服务不可达"
          description: "HTTP 探测目标 {{ $labels.instance }} 连续 1 分钟探测失败。"

      - alert: HttpServiceSlow
        expr: probe_duration_seconds{job="blackbox-http"} > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "HTTP 服务响应时间过高"
          description: "目标 {{ $labels.instance }} 连续 5 分钟响应时间超过 2 秒，当前值 {{ printf \"%.2f\" $value }} 秒。"

      - alert: TcpPortDown
        expr: probe_success{job="blackbox-tcp"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "TCP 端口不可达"
          description: "TCP 探测目标 {{ $labels.instance }} 连续 1 分钟探测失败。"
```

写入文件：

```bash
cat > /opt/monitoring/prometheus/rules/host-services-alerts.yml <<'EOF'
groups:
  - name: host-services-alerts
    rules:
      - alert: HostDown
        expr: up{job="node-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "宿主机监控不可达"
          description: "Prometheus 已连续 1 分钟无法抓取 node-exporter。"

      - alert: HostHighCpuLoad
        expr: (1 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "宿主机 CPU 使用率过高"
          description: "实例 {{ $labels.instance }} 的 CPU 使用率连续 10 分钟高于 85%，当前值 {{ printf \"%.2f\" $value }}%。"

      - alert: HostMemoryLow
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 < 15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "宿主机可用内存不足"
          description: "实例 {{ $labels.instance }} 可用内存低于 15%，当前值 {{ printf \"%.2f\" $value }}%。"

      - alert: HostDiskRootLow
        expr: (node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}) * 100 < 15
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "根分区磁盘可用空间不足"
          description: "实例 {{ $labels.instance }} 根分区可用空间低于 15%，当前值 {{ printf \"%.2f\" $value }}%。"

      - alert: RedisExporterDown
        expr: up{job="redis-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis Exporter 不可达"
          description: "Prometheus 无法抓取 redis-exporter 指标。"

      - alert: RedisInstanceDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis 实例不可达"
          description: "redis_exporter 可以访问，但 Redis 实例连接失败。"

      - alert: MongoExporterDown
        expr: up{job="mongodb-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB Exporter 不可达"
          description: "Prometheus 无法抓取 mongodb-exporter 指标。"

      - alert: MongoInstanceDown
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB 实例不可达"
          description: "mongodb_exporter 可以访问，但 MongoDB 实例连接失败。"

      - alert: HttpServiceDown
        expr: probe_success{job="blackbox-http"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "HTTP 服务不可达"
          description: "HTTP 探测目标 {{ $labels.instance }} 连续 1 分钟探测失败。"

      - alert: HttpServiceSlow
        expr: probe_duration_seconds{job="blackbox-http"} > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "HTTP 服务响应时间过高"
          description: "目标 {{ $labels.instance }} 连续 5 分钟响应时间超过 2 秒，当前值 {{ printf \"%.2f\" $value }} 秒。"

      - alert: TcpPortDown
        expr: probe_success{job="blackbox-tcp"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "TCP 端口不可达"
          description: "TCP 探测目标 {{ $labels.instance }} 连续 1 分钟探测失败。"
EOF
```

## 第 9 步：编写 Alertmanager 配置

Alertmanager 负责：

- 接收 Prometheus 发来的告警
- 按告警名称、实例分组
- 控制告警合并和重复发送节奏
- 把最终消息发给我们的飞书转发服务

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ["alertname", "instance", "job"]
  group_wait: 10s
  group_interval: 30s
  repeat_interval: 2h
  receiver: feishu-webhook

receivers:
  - name: feishu-webhook
    webhook_configs:
      - url: http://feishu-relay:8080/webhook
        send_resolved: true
```

写入文件：

```bash
cat > /opt/monitoring/alertmanager/alertmanager.yml <<'EOF'
global:
  resolve_timeout: 5m

route:
  group_by: ["alertname", "instance", "job"]
  group_wait: 10s
  group_interval: 30s
  repeat_interval: 2h
  receiver: feishu-webhook

receivers:
  - name: feishu-webhook
    webhook_configs:
      - url: http://feishu-relay:8080/webhook
        send_resolved: true
EOF
```

## 第 10 步：给 Grafana 配置默认数据源

这样 Grafana 第一次启动时就会自动挂上 Prometheus，不需要手工点。

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

写入文件：

```bash
cat > /opt/monitoring/grafana/provisioning/datasources/prometheus.yml <<'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
```

## 第 11 步：编写飞书告警转发服务

### 11.1 为什么要自己写一个 relay

Alertmanager 的 webhook 发出来是一整坨 JSON，飞书自定义机器人并不能直接吃这个格式。

所以最稳的办法就是在中间放一个自己的轻量服务：

1. 接收 Alertmanager webhook
2. 把告警整理成中文文本
3. 如果飞书机器人开启签名，就自动带上签名
4. 再转发给飞书机器人

这里我用 Python 标准库写，不依赖 Flask、FastAPI、requests，镜像更轻，也更容易排障。

### 11.2 `app.py`

```python
import base64
import hashlib
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen


FEISHU_WEBHOOK_URL = os.environ.get("FEISHU_WEBHOOK_URL", "").strip()
FEISHU_SECRET = os.environ.get("FEISHU_SECRET", "").strip()


def build_sign(timestamp: str, secret: str) -> str:
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_code = hmac.new(
        string_to_sign.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    return base64.b64encode(hmac_code).decode("utf-8")


def format_alert_message(payload: dict) -> str:
    status = payload.get("status", "unknown").upper()
    receiver = payload.get("receiver", "unknown")
    alerts = payload.get("alerts", [])
    common_labels = payload.get("commonLabels", {})

    lines = [
        "Prometheus 告警通知",
        f"状态: {status}",
        f"接收器: {receiver}",
        f"告警数: {len(alerts)}",
    ]

    if common_labels:
        alertname = common_labels.get("alertname")
        job = common_labels.get("job")
        instance = common_labels.get("instance")
        severity = common_labels.get("severity")

        if alertname:
            lines.append(f"告警名: {alertname}")
        if severity:
            lines.append(f"级别: {severity}")
        if job:
            lines.append(f"任务: {job}")
        if instance:
            lines.append(f"实例: {instance}")

    lines.append("")
    lines.append("明细:")

    for idx, alert in enumerate(alerts, start=1):
        labels = alert.get("labels", {})
        annotations = alert.get("annotations", {})
        starts_at = alert.get("startsAt", "")
        ends_at = alert.get("endsAt", "")

        lines.append(f"{idx}. {labels.get('alertname', 'unknown')}")
        lines.append(f"   summary: {annotations.get('summary', '-')}")
        lines.append(f"   description: {annotations.get('description', '-')}")
        lines.append(f"   severity: {labels.get('severity', '-')}")
        lines.append(f"   instance: {labels.get('instance', '-')}")
        lines.append(f"   startsAt: {starts_at}")

        if ends_at and ends_at != "0001-01-01T00:00:00Z":
            lines.append(f"   endsAt: {ends_at}")

    return "\n".join(lines)


def push_to_feishu(text: str) -> tuple[int, str]:
    if not FEISHU_WEBHOOK_URL:
        return 500, "FEISHU_WEBHOOK_URL is empty"

    body = {
        "msg_type": "text",
        "content": {
            "text": text
        }
    }

    if FEISHU_SECRET:
        timestamp = str(int(time.time()))
        body["timestamp"] = timestamp
        body["sign"] = build_sign(timestamp, FEISHU_SECRET)

    req = Request(
        FEISHU_WEBHOOK_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
            return resp.status, content
    except HTTPError as exc:
        content = exc.read().decode("utf-8", errors="ignore")
        return exc.code, content
    except Exception as exc:
        return 500, str(exc)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/healthz":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path != "/webhook":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except Exception as exc:
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))
            return

        text = format_alert_message(payload)
        status_code, response_text = push_to_feishu(text)

        ok = 200 <= status_code < 300
        self.send_response(200 if ok else 502)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            json.dumps(
                {
                    "ok": ok,
                    "forward_status": status_code,
                    "forward_response": response_text,
                },
                ensure_ascii=False,
            ).encode("utf-8")
        )

    def log_message(self, format: str, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8080), Handler)
    print("feishu-relay listening on :8080")
    server.serve_forever()
```

写入文件：

```bash
cat > /opt/monitoring/feishu-relay/app.py <<'EOF'
import base64
import hashlib
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen


FEISHU_WEBHOOK_URL = os.environ.get("FEISHU_WEBHOOK_URL", "").strip()
FEISHU_SECRET = os.environ.get("FEISHU_SECRET", "").strip()


def build_sign(timestamp: str, secret: str) -> str:
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_code = hmac.new(
        string_to_sign.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    return base64.b64encode(hmac_code).decode("utf-8")


def format_alert_message(payload: dict) -> str:
    status = payload.get("status", "unknown").upper()
    receiver = payload.get("receiver", "unknown")
    alerts = payload.get("alerts", [])
    common_labels = payload.get("commonLabels", {})

    lines = [
        "Prometheus 告警通知",
        f"状态: {status}",
        f"接收器: {receiver}",
        f"告警数: {len(alerts)}",
    ]

    if common_labels:
        alertname = common_labels.get("alertname")
        job = common_labels.get("job")
        instance = common_labels.get("instance")
        severity = common_labels.get("severity")

        if alertname:
            lines.append(f"告警名: {alertname}")
        if severity:
            lines.append(f"级别: {severity}")
        if job:
            lines.append(f"任务: {job}")
        if instance:
            lines.append(f"实例: {instance}")

    lines.append("")
    lines.append("明细:")

    for idx, alert in enumerate(alerts, start=1):
        labels = alert.get("labels", {})
        annotations = alert.get("annotations", {})
        starts_at = alert.get("startsAt", "")
        ends_at = alert.get("endsAt", "")

        lines.append(f"{idx}. {labels.get('alertname', 'unknown')}")
        lines.append(f"   summary: {annotations.get('summary', '-')}")
        lines.append(f"   description: {annotations.get('description', '-')}")
        lines.append(f"   severity: {labels.get('severity', '-')}")
        lines.append(f"   instance: {labels.get('instance', '-')}")
        lines.append(f"   startsAt: {starts_at}")

        if ends_at and ends_at != "0001-01-01T00:00:00Z":
            lines.append(f"   endsAt: {ends_at}")

    return "\n".join(lines)


def push_to_feishu(text: str) -> tuple[int, str]:
    if not FEISHU_WEBHOOK_URL:
        return 500, "FEISHU_WEBHOOK_URL is empty"

    body = {
        "msg_type": "text",
        "content": {
            "text": text
        }
    }

    if FEISHU_SECRET:
        timestamp = str(int(time.time()))
        body["timestamp"] = timestamp
        body["sign"] = build_sign(timestamp, FEISHU_SECRET)

    req = Request(
        FEISHU_WEBHOOK_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
            return resp.status, content
    except HTTPError as exc:
        content = exc.read().decode("utf-8", errors="ignore")
        return exc.code, content
    except Exception as exc:
        return 500, str(exc)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/healthz":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path != "/webhook":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except Exception as exc:
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))
            return

        text = format_alert_message(payload)
        status_code, response_text = push_to_feishu(text)

        ok = 200 <= status_code < 300
        self.send_response(200 if ok else 502)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            json.dumps(
                {
                    "ok": ok,
                    "forward_status": status_code,
                    "forward_response": response_text,
                },
                ensure_ascii=False,
            ).encode("utf-8")
        )

    def log_message(self, format: str, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8080), Handler)
    print("feishu-relay listening on :8080")
    server.serve_forever()
EOF
```

### 11.3 `Dockerfile`

```dockerfile
FROM python:3.12-alpine

WORKDIR /app
COPY app.py /app/app.py

ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["python", "/app/app.py"]
```

写入文件：

```bash
cat > /opt/monitoring/feishu-relay/Dockerfile <<'EOF'
FROM python:3.12-alpine

WORKDIR /app
COPY app.py /app/app.py

ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["python", "/app/app.py"]
EOF
```

## 第 12 步：启动整套监控栈

在 `/opt/monitoring` 目录下执行：

```bash
cd /opt/monitoring
docker compose up -d --build
```

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f prometheus
docker compose logs -f alertmanager
docker compose logs -f feishu-relay
```

## 第 13 步：逐项验证是否正常

### 13.1 看容器是否都起来了

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

你至少应该看到这些容器：

- `prometheus`
- `grafana`
- `alertmanager`
- `node-exporter`
- `redis-exporter`
- `mongodb-exporter`
- `blackbox-exporter`
- `feishu-relay`

### 13.2 看 Prometheus targets

浏览器打开：

```text
http://你的服务器IP:9090/targets
```

理想状态下应该全部是 `UP`。

### 13.3 直接用 curl 验证 metrics

```bash
curl http://127.0.0.1:9100/metrics | head
curl http://127.0.0.1:9121/metrics | head
curl http://127.0.0.1:9216/metrics | head
curl http://127.0.0.1:9115/metrics | head
curl http://127.0.0.1:9090/-/healthy
curl http://127.0.0.1:9093/-/healthy
curl http://127.0.0.1:18080/healthz
```

### 13.4 验证 blackbox 的 HTTP 探测

```bash
curl "http://127.0.0.1:9115/probe?target=http://host.docker.internal:8080/health&module=http_2xx_local"
```

如果正常，你会看到：

```text
probe_success 1
```

### 13.5 验证 blackbox 的 TCP 探测

```bash
curl "http://127.0.0.1:9115/probe?target=host.docker.internal:9000&module=tcp_connect_local"
```

如果正常，你会看到：

```text
probe_success 1
```

## 第 14 步：登录 Grafana 并创建基础看板

浏览器打开：

```text
http://你的服务器IP:3000
```

默认账户就是 `.env` 里配置的：

- 用户名：`GRAFANA_ADMIN_USER`
- 密码：`GRAFANA_ADMIN_PASSWORD`

因为我们已经做了 Provisioning，所以默认数据源应该已经是 Prometheus。

建议你先手工建一个总览看板，至少放这些面板：

### 14.1 宿主机

CPU 使用率：

```promql
(1 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100
```

内存使用率：

```promql
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
```

根分区磁盘使用率：

```promql
100 * (1 - node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"})
```

系统负载：

```promql
node_load1
```

### 14.2 Redis

Redis 是否在线：

```promql
redis_up
```

Redis 已用内存：

```promql
redis_memory_used_bytes
```

Redis 客户端连接数：

```promql
redis_connected_clients
```

### 14.3 MongoDB

MongoDB 是否在线：

```promql
mongodb_up
```

如果你后续想做更细致的 MongoDB 面板，建议再按你自己的版本去补连接数、opcounters、replica set 相关指标。

### 14.4 指定端口服务

HTTP 服务可用性：

```promql
probe_success{job="blackbox-http"}
```

HTTP 响应时间：

```promql
probe_duration_seconds{job="blackbox-http"}
```

TCP 端口可用性：

```promql
probe_success{job="blackbox-tcp"}
```

## 第 15 步：验证飞书告警链路

### 15.1 最简单的办法：手工停掉 Redis

如果你的 Redis 是宿主机 systemd 服务：

```bash
sudo systemctl stop redis-server
```

等待 1 到 2 分钟，理论上会触发：

- `RedisInstanceDown`

收到飞书消息后，再恢复：

```bash
sudo systemctl start redis-server
```

### 15.2 停掉被监控的 HTTP 服务

比如你监控的是 `127.0.0.1:8080`，把对应服务停掉后，应该触发：

- `HttpServiceDown`

### 15.3 单独测试飞书 relay

也可以直接给 relay 发一个模拟 Alertmanager payload：

```bash
curl -X POST "http://127.0.0.1:18080/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "feishu-webhook",
    "status": "firing",
    "commonLabels": {
      "alertname": "ManualTestAlert",
      "severity": "warning",
      "job": "manual",
      "instance": "test-instance"
    },
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "ManualTestAlert",
          "severity": "warning",
          "instance": "test-instance"
        },
        "annotations": {
          "summary": "这是一条手工测试告警",
          "description": "如果你能在飞书里收到这条消息，说明整条告警链路已经通了。"
        },
        "startsAt": "2026-03-23T20:00:00Z"
      }
    ]
  }'
```

## 第 16 步：开放防火墙端口

如果你开了 `ufw`，至少要放行你真正需要访问的端口。例如：

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 9090/tcp
sudo ufw allow 9093/tcp
sudo ufw status
```

如果这台机器只是你自己内网使用，建议只开：

- `3000` 给 Grafana
- `9090` 给 Prometheus

`9093` 的 Alertmanager 如果不需要外部访问，可以不开放。

## 第 17 步：常见故障排查

### 17.1 Prometheus targets 里 Redis 是 DOWN

优先检查：

```bash
docker compose logs -f redis-exporter
```

最常见原因：

- `REDIS_ADDR` 写错
- Redis 绑定了 `127.0.0.1` 但容器没有通过 `host.docker.internal` 正确访问
- Redis 开了密码但连接串没带密码

### 17.2 MongoDB exporter 是 DOWN

优先检查：

```bash
docker compose logs -f mongodb-exporter
```

最常见原因：

- `MONGODB_URI` 写错
- MongoDB 开了认证但 URI 没带用户名密码
- 认证库不是 `admin`

### 17.3 blackbox 探测宿主机端口失败

先确认宿主机服务真的在监听：

```bash
ss -lntp | grep 8080
ss -lntp | grep 9000
```

再确认容器里能不能访问：

```bash
docker exec -it blackbox-exporter sh
wget -qO- http://host.docker.internal:8080/health
```

### 17.4 飞书没有收到消息

按顺序检查：

1. 飞书机器人 webhook 地址是否正确
2. 如果机器人开启了签名，`FEISHU_SECRET` 是否填写
3. `feishu-relay` 是否正常启动
4. Alertmanager 的 receiver URL 是否写成了 `http://feishu-relay:8080/webhook`

建议直接看日志：

```bash
docker compose logs -f feishu-relay
docker compose logs -f alertmanager
```

## 第 18 步：这套方案为什么适合单机

这套方案特别适合下面这种场景：

- 一台 Ubuntu 服务器，先把监控补齐
- 服务并不复杂，但必须知道“机器有没有炸”“Redis 和 MongoDB 还活不活”“应用端口通不通”
- 想先快速上线，后面再慢慢扩展

它的优点是：

- 所有组件都 Docker 化，迁移方便
- 配置文件清晰，后续接 Git 管理也容易
- Prometheus 规则和 Alertmanager 路由一目了然
- 飞书链路完全可控，不依赖第三方转发服务
- 后续新增被监控端口，只要改 `prometheus.yml` 即可

## 第 19 步：后续可以继续扩展什么

如果你后面要把它继续做成生产级监控，可以再加这些能力：

- 给 Grafana 配 dashboard provisioning，把看板也代码化
- 给 Alertmanager 增加静默、升级通知、值班路由
- 给 Redis 增加慢查询、主从复制、内存碎片率告警
- 给 MongoDB 增加副本集健康、连接数、锁等待告警
- 把黑盒探测拆成 `公网 URL`、`内网 URL`、`TCP 端口` 三类 job
- 给 Docker 本身加 `cadvisor`，补齐容器级 CPU / 内存 / IO 指标

## 一套最小可执行命令清单

如果你只想先快速起起来，可以按这个顺序走：

```bash
sudo mkdir -p /opt/monitoring
sudo chown -R $USER:$USER /opt/monitoring
cd /opt/monitoring

# 1. 写入 .env
# 2. 写入 docker-compose.yml
# 3. 写入 prometheus/prometheus.yml
# 4. 写入 prometheus/rules/host-services-alerts.yml
# 5. 写入 alertmanager/alertmanager.yml
# 6. 写入 blackbox/blackbox.yml
# 7. 写入 grafana/provisioning/datasources/prometheus.yml
# 8. 写入 feishu-relay/app.py 和 Dockerfile

docker compose up -d --build
docker compose ps
```

## 结语

如果你只是在一台裸 Ubuntu 上把可观测性先补起来，不追求一上来就上 Kubernetes、Service Mesh、云监控平台，那么这一套已经足够实用：

- 看得到机器状态
- 看得到 Redis 和 MongoDB
- 看得到指定端口服务是否活着
- 出问题会进飞书
- 后面要扩容也不推倒重来

先把“能看见问题”做好，很多运维焦虑就会立刻下降一大截。
