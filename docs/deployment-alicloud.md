# Deployment on Alibaba Cloud

This document is the English companion for the Alibaba Cloud deployment notes.

## 1. Recommended Alibaba Cloud topology

For Alibaba Cloud, a practical setup is:

- ECS instance for the application runtime
- Docker Engine + Docker Compose
- PostgreSQL running either on the same host or a managed database service
- Nginx or Caddy for reverse proxy
- optional OSS or CDN later if you move beyond local uploads

## 2. Suggested rollout sequence

1. prepare the ECS instance
2. install Docker and Docker Compose
3. upload the project or pull the image
4. place the production `.env`
5. start PostgreSQL
6. run `npm run db:push`
7. run `npm run db:bootstrap`
8. start the app service
9. configure your domain and HTTPS

## 3. Alibaba Cloud specifics to remember

- verify security group rules for HTTP, HTTPS, and SSH
- confirm the server timezone if you rely on cron timing
- if you keep uploads on local disk, ensure backup coverage for `public/uploads`
- if you later add OSS, treat it as a storage migration rather than a drop-in flip

## 4. Recommended checks

After deployment, verify:

- public homepage
- login and admin access
- email verification and password reset delivery
- `/tools` provider validation
- daily paper sync and weekly digest jobs

## 5. Related docs

- [deployment.md](./deployment.md)
- [deployment.zh-CN.md](./deployment.zh-CN.md)
- [deployment-alicloud.zh-CN.md](./deployment-alicloud.zh-CN.md)
