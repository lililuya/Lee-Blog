# 阿里云 ECS 部署指南（域名 + HTTPS + Docker + Nginx）

这份文档面向你当前这个项目，目标是在阿里云 ECS 上完成生产部署，并通过你自己的域名和证书对外提供访问。

文档默认采用以下方案：

- 服务器：阿里云 ECS
- 系统：Ubuntu 22.04 或 24.04 LTS
- 反向代理：Nginx
- 容器：Docker Engine + Docker Compose 插件
- 应用：当前仓库的 `docker-compose.prod.yml`
- 域名访问：`https://你的域名`
- 证书：你已经持有的 SSL 证书文件

如果你的系统不是 Ubuntu，也可以照着做，但软件安装命令需要替换成对应发行版的版本。

## 1. 推荐部署架构

推荐的生产拓扑如下：

```text
用户浏览器
   -> 域名 DNS 解析
   -> 阿里云 ECS 公网 IP
   -> Nginx 监听 80 / 443
   -> 反向代理到 127.0.0.1:3000
   -> Next.js App 容器
   -> PostgreSQL 容器
```

这样做的好处是：

- 域名、HTTPS、证书由 Nginx 统一处理
- 应用只需要跑在容器内的 3000 端口
- PostgreSQL 也可以只在 Docker 网络内部使用
- 后面如果你新增别的 AI 服务，可以继续通过 Nginx 按子域名转发

## 2. 部署前必须先确认的事

请先确认以下信息：

- ECS 是否已经有公网 IP 或绑定了 EIP
- 服务器系统是不是 Ubuntu 22.04 / 24.04
- 你准备让哪个域名访问这个项目，例如：`example.com` 或 `blog.example.com`
- 你手上的证书文件格式是否为 Nginx 可用格式，例如 `.pem` / `.key`
- 你的 ECS 区域是否在中国大陆

### 2.1 中国大陆服务器的重要说明

如果你的 ECS 在中国大陆，根据阿里云官方文档：

- 网站域名需要完成 ICP 备案后，网站才可以正常对外提供访问
- DNS 解析可以先配置，但即使解析生效，未备案的网站仍然可能无法访问

所以：

- 如果 ECS 在中国大陆：先确认备案状态
- 如果 ECS 在中国香港、新加坡、日本、美国等中国大陆以外地域：通常不需要 ICP 备案

另外，阿里云官方文档还特别说明：如果网站部署在中国大陆并面向中国大陆提供服务，通常还需要按要求处理公安备案等合规事项。

## 3. 阿里云控制台侧的准备工作

### 3.1 安全组配置

到阿里云 ECS 控制台，找到实例绑定的安全组，至少放行以下入方向端口：

- `22/TCP`：SSH 登录
- `80/TCP`：HTTP
- `443/TCP`：HTTPS

推荐做法：

- `22` 端口不要对全网永久开放，尽量只允许你自己的固定公网 IP
- `3000` 不要在安全组里开放给公网
- `5432` 不要在安全组里开放给公网

原因：

- 网站应通过 Nginx 的 `80/443` 访问
- 应用 `3000` 只给服务器本机和 Nginx 使用
- PostgreSQL 只给 Docker 内部网络使用

### 3.2 域名解析配置

如果你用的是阿里云 DNS，在域名解析里添加 A 记录。

常见配置：

1. 根域名直达：
   - 主机记录：`@`
   - 记录类型：`A`
   - 记录值：你的 ECS 公网 IP

2. `www` 子域名：
   - 主机记录：`www`
   - 记录类型：`A`
   - 记录值：你的 ECS 公网 IP

3. 如果你想把博客单独放到子域名，例如 `blog.example.com`：
   - 主机记录：`blog`
   - 记录类型：`A`
   - 记录值：你的 ECS 公网 IP

建议：

- TTL 可以先设置成 10 分钟左右，方便初次调试
- 最终只保留一个主域名作为站点主入口，另一个域名做 301 跳转

### 3.3 证书准备

你已经有证书的话，建议准备 Nginx 使用的这两个文件：

- `fullchain.pem` 或站点证书 `.pem`
- 私钥文件 `.key`

阿里云证书管理服务官方也支持下载 Nginx 格式证书包。如果你后面重新签发证书，下载 Nginx 包即可，不需要自己转换格式。

## 4. 在 ECS 上安装基础环境

以下步骤默认你已经通过 SSH 登录到了 ECS。

### 4.1 更新系统并安装常用工具

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg lsb-release nginx
```

### 4.2 安装 Docker Engine 和 Docker Compose 插件

建议按 Docker 官方的 Ubuntu 安装方式安装，而不是混用系统自带旧包。

```bash
sudo apt remove -y docker.io docker-compose docker-compose-v2 podman-docker containerd runc || true

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo ${VERSION_CODENAME}) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

验证：

```bash
docker --version
docker compose version
sudo systemctl status docker --no-pager
```

可选：把当前用户加入 `docker` 用户组，避免每次都 `sudo`。

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## 5. 上传项目到服务器

推荐部署目录：

```bash
sudo mkdir -p /srv/scholar-blog-studio
sudo chown -R $USER:$USER /srv/scholar-blog-studio
cd /srv/scholar-blog-studio
```

有两种方式把项目放上去：

### 5.1 方式 A：直接在服务器拉 Git 仓库

```bash
git clone <你的仓库地址> .
```

### 5.2 方式 B：本地打包上传

如果仓库还没推到远端，也可以在本地打包上传再解压。

## 6. 准备生产环境变量

在服务器项目目录下创建生产 `.env`：

```bash
cd /srv/scholar-blog-studio
nano .env
```

建议内容如下，请按你的真实值替换：

```env
POSTGRES_DB="scholar_blog"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="请换成强密码"

DATABASE_URL="postgresql://postgres:请换成强密码@db:5432/scholar_blog?schema=public"
APP_URL="https://你的主域名"
SESSION_SECRET="请换成一串足够长的随机字符串"
CHAT_ALLOW_GUEST="false"

ADMIN_NAME="你的站点管理员名"
ADMIN_EMAIL="你的管理员邮箱"
ADMIN_PASSWORD="请换成强密码"

OPENAI_API_KEY=""
DEEPSEEK_API_KEY=""
ANTHROPIC_API_KEY=""

APP_IMAGE="scholar-blog-studio:prod"
```

这里有几个非常关键的点：

- `APP_URL` 必须写成你最终对外访问的 HTTPS 域名，例如 `https://blog.example.com`
- `DATABASE_URL` 在生产 Docker 场景下必须指向 `db:5432`，不要写成 `localhost:5432`
- `SESSION_SECRET` 必须足够长，至少 32 字符以上
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` 是网站后台管理员账号，不是数据库账号
- `APP_IMAGE` 如果你走“服务器本地构建”方案，就写本地镜像名即可

## 7. 首次部署：推荐先走“服务器本地构建”

这是最容易成功的第一种方式，不依赖 GHCR，也不依赖 GitHub Actions。

### 7.1 构建应用镜像

```bash
cd /srv/scholar-blog-studio
docker build -t scholar-blog-studio:prod .
```

### 7.2 启动数据库

```bash
docker compose -f docker-compose.prod.yml up -d db
```

检查数据库健康状态：

```bash
docker compose -f docker-compose.prod.yml ps
```

### 7.3 初始化数据库结构

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:push
```

### 7.4 初始化管理员账号和演示数据

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:bootstrap
```

### 7.5 启动应用

```bash
docker compose -f docker-compose.prod.yml up -d app
```

### 7.6 检查容器日志

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

如果一切正常，此时服务器本机访问 `http://127.0.0.1:3000` 应该已经能看到站点。

你也可以执行：

```bash
curl -I http://127.0.0.1:3000
```

## 8. 配置 Nginx 反向代理和 HTTPS

### 8.1 上传证书文件

推荐把证书放到：

```bash
sudo mkdir -p /etc/nginx/ssl/你的域名
```

例如：

```bash
sudo mkdir -p /etc/nginx/ssl/example.com
```

然后把证书文件上传到该目录，例如：

- `/etc/nginx/ssl/example.com/fullchain.pem`
- `/etc/nginx/ssl/example.com/privkey.key`

设置权限：

```bash
sudo chmod 600 /etc/nginx/ssl/example.com/*
```

### 8.2 创建 Nginx 站点配置

创建文件：

```bash
sudo nano /etc/nginx/sites-available/scholar-blog.conf
```

如果你要让 `example.com` 和 `www.example.com` 都访问这个博客，可以使用下面这个配置：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://example.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.example.com;

    ssl_certificate /etc/nginx/ssl/example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/example.com/privkey.key;

    return 301 https://example.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/example.com/privkey.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300;
    }
}
```

如果你使用的是 `blog.example.com` 这种子域名，把 `server_name` 和证书路径换成对应值即可。

### 8.3 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/scholar-blog.conf /etc/nginx/sites-enabled/scholar-blog.conf
sudo nginx -t
sudo systemctl reload nginx
```

如果 `nginx -t` 报错，先不要 reload，先修正配置。

## 9. 通过域名访问指定服务的推荐方式

对当前这个仓库，我建议使用“独立域名 / 独立子域名”方式，而不是路径前缀挂载。

推荐方式：

- `example.com` 或 `blog.example.com` -> 当前博客应用（3000）
- `ai.example.com` -> 未来 AI 工具服务（比如 8080）
- `admin.example.com` 不建议单独拆，因为当前后台已经是同一站点的 `/admin`

原因：

- 当前项目是完整的 Next.js 站点，默认工作在域名根路径 `/`
- 如果把它强行挂到 `/blog-system/` 这样的路径前缀下，还需要额外配置 `basePath`，目前仓库没有做这层适配
- 子域名路由更清晰，也更容易扩展多个服务

### 9.1 多服务按子域名转发示例

如果以后同一台 ECS 上还有别的服务，可以继续新增 Nginx 配置：

```nginx
server {
    listen 443 ssl http2;
    server_name ai.example.com;

    ssl_certificate /etc/nginx/ssl/ai.example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/ai.example.com/privkey.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

这样：

- 博客走 `example.com`
- AI 服务走 `ai.example.com`

管理上会更清楚。

## 10. 首次上线后的验证清单

部署完成后，建议按下面顺序验证：

1. `docker compose -f docker-compose.prod.yml ps`
2. `curl -I http://127.0.0.1:3000`
3. `sudo nginx -t`
4. 浏览器访问 `https://你的域名`
5. 检查首页、`/login`、`/admin`、`/papers`、`/notes`
6. 用管理员账号登录
7. 测试发表评论、聊天浮窗、后台页面是否正常
8. 检查数据库是否已经写入初始化数据

## 11. 项目更新时怎么发布

如果你采用“服务器本地构建”方案，更新流程如下：

```bash
cd /srv/scholar-blog-studio
git pull
docker build -t scholar-blog-studio:prod .
docker compose -f docker-compose.prod.yml run --rm app npm run db:push
docker compose -f docker-compose.prod.yml up -d app
```

如果你改了管理员默认账号、种子数据，或者需要恢复默认管理员状态：

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:bootstrap
```

## 12. 定时任务：每日论文和每周 Digest

当前仓库已经带了 GitHub Actions 定时任务：

- `daily-papers.yml`
- `weekly-digest.yml`

当前默认时间：

- 每日论文：UTC `00:00`，也就是北京时间 `08:00`
- 每周 Digest：每周一 UTC `00:00`，也就是北京时间周一 `08:00`

如果你不想依赖 GitHub Actions，也可以直接在服务器上用 cron。

### 12.1 服务器 cron 示例

编辑 crontab：

```bash
crontab -e
```

加入：

```cron
0 8 * * * cd /srv/scholar-blog-studio && docker compose -f docker-compose.prod.yml run --rm app npm run papers:sync >> /var/log/scholar-papers.log 2>&1
0 8 * * 1 cd /srv/scholar-blog-studio && docker compose -f docker-compose.prod.yml run --rm app npm run digest:generate >> /var/log/scholar-digest.log 2>&1
```

## 13. 启用仓库现有的 GitHub 自动部署（可选）

当前仓库已经有现成的自动部署工作流：

- `.github/workflows/deploy.yml`

它的思路是：

1. GitHub Actions 构建 Docker 镜像
2. 推送到 GHCR
3. SSH 登录 ECS
4. 写入 `.env`
5. 拉取镜像
6. 执行 `db:push`
7. 执行 `db:bootstrap`
8. 启动应用

### 13.1 适合什么时候启用

建议顺序是：

- 先用“服务器本地构建”把第一次部署跑通
- 网站稳定后，再启用 GitHub Actions 自动发布

这样更容易定位问题。

### 13.2 GitHub Secrets 需要准备什么

至少要配置：

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USERNAME`
- `SSH_PRIVATE_KEY`
- `APP_ENV_FILE`
- `GHCR_PAT`

补充说明：

- `APP_ENV_FILE` 就是你生产环境 `.env` 的全文
- `GHCR_PAT` 至少要能让服务器拉取 GHCR 镜像，通常需要 `read:packages`
- 第一次部署前，仍然要先把 `docker-compose.prod.yml` 上传到 `/srv/scholar-blog-studio`

## 14. 备份与恢复建议

至少建议做两类备份：

### 14.1 数据库备份

```bash
docker exec -t $(docker ps --format '{{.Names}}' | grep db) pg_dump -U postgres scholar_blog > /srv/backup-scholar-blog-$(date +%F).sql
```

你也可以把数据库容器名固定后写死成具体名字。

### 14.2 证书与环境变量备份

建议安全备份：

- `/srv/scholar-blog-studio/.env`
- `/etc/nginx/sites-available/scholar-blog.conf`
- `/etc/nginx/ssl/你的域名/`

## 15. 常见问题排查

### 15.1 域名打不开

先检查：

- DNS A 记录是否已经指向 ECS 公网 IP
- 安全组是否已放行 `80/443`
- `nginx -t` 是否通过
- `systemctl status nginx` 是否正常
- ECS 是否真的有公网 IP

### 15.2 访问域名返回 502

通常优先检查：

- `docker compose -f docker-compose.prod.yml ps`
- `docker compose -f docker-compose.prod.yml logs -f app`
- 本机 `curl -I http://127.0.0.1:3000`

如果本机 3000 都不通，问题在应用容器，不在 Nginx。

### 15.3 登录失败

先区分两类账号：

- 数据库账号：`POSTGRES_USER` / `POSTGRES_PASSWORD`
- 网站管理员账号：`ADMIN_EMAIL` / `ADMIN_PASSWORD`

如果你改过管理员账号配置，记得重新执行：

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:bootstrap
```

### 15.4 数据库连不上

最常见原因：

- 生产 `.env` 里把 `DATABASE_URL` 写成了 `localhost`
- 正确写法应为容器网络里的 `db:5432`

### 15.5 证书生效但浏览器提示不安全

请检查：

- 证书是否匹配当前域名
- 是否上传了完整证书链
- Nginx 配置里的证书路径是否正确
- 访问的是否是证书覆盖范围内的域名，例如 `example.com` 和 `www.example.com` 是否都被证书包含

### 15.6 中国大陆服务器已解析但仍打不开

如果 ECS 在中国大陆，优先检查：

- 是否已经完成 ICP 备案
- 是否属于备案审核中状态
- 域名和备案主体信息是否一致

## 16. 我对你当前项目的最终建议

对你这个仓库，最稳妥的上线顺序是：

1. 先在 ECS 上按本文档完成手动首次部署
2. 用域名 + Nginx + 证书把 HTTPS 跑通
3. 手动验证登录、后台、Papers、Notes、聊天模块
4. 再启用 GitHub Actions 自动发布
5. 最后再补数据库定时备份和监控

这样出问题时最容易定位。

## 17. 官方参考资料

以下信息在编写本文档时已参考官方文档，日期为 2026-03-11：

- 阿里云 DNS 添加解析记录：<https://www.alibabacloud.com/help/en/dns/add-a-dns-record>
- 阿里云 ECS 安全组规则：<https://www.alibabacloud.com/help/en/ecs/user-guide/start-using-security-groups>
- 阿里云证书下载（Nginx 格式）：<https://www.alibabacloud.com/help/en/ssl-certificate/download-an-ssl-certificate>
- 阿里云 ICP 与 DNS 关系说明：<https://www.alibabacloud.com/help/en/dns/icp-and-dns>
- 阿里云普通网站 ICP 要求：<https://www.alibabacloud.com/help/en/icp-filing/basic-icp-service/product-overview/icp-filing-requirements-for-a-regular-website>
- Docker 官方 Ubuntu 安装文档：<https://docs.docker.com/engine/install/ubuntu/>

如果你愿意，我下一步可以继续直接帮你做两件事中的一件：

- 按你的真实域名，给你生成一份可以直接粘贴使用的 `.env` 模板和 Nginx 配置
- 把 GitHub Actions 自动部署这一套也帮你补成“阿里云专用配置说明”
