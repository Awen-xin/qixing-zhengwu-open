# 七星数智公开一体化云平台

这是七星政务公开网站的可运行版本。当前版本包含：

- 首页六大栏目入口
- 普通用户注册查看政务公开信息
- 普通管理员登录后只能上传和删除本单位信息
- 最高权限管理员可维护单位目录
- Word、PDF、Excel 文件上传
- 公开信息、单位目录、用户登记信息持久化保存到服务器本地 `data/db.json`
- 上传文件默认保存到 `uploads/`，配置阿里云 OSS 后自动保存到 OSS

## 本地运行

```bash
node server.js
```

打开：

```text
http://localhost:3000
```

## 阿里云 OSS 上传配置

如果需要把管理员上传的 Word、PDF、Excel 文件保存到 OSS，在服务器服务中配置这些环境变量：

```bash
OSS_REGION=oss-cn-beijing
OSS_BUCKET=qixing-zhengwu-files
OSS_ACCESS_KEY_ID=RAM用户的AccessKey ID
OSS_ACCESS_KEY_SECRET=RAM用户的AccessKey Secret
```

Bucket 建议配置：

```text
地域：华北2（北京）
存储类型：标准存储
冗余类型：本地冗余
读写权限：私有
```

配置后，上传文件会保存到 OSS 的 `uploads/` 目录下。网页中的文件入口会通过后端生成临时访问链接，不需要把 Bucket 改成公共读。

## 演示登录

管理员登录页中的账号密码暂为演示字段。当前第一版以后端角色和单位选择为准：

```text
普通管理员：选择“普通管理员”和自己的单位
最高权限管理员：选择“最高权限管理员”
普通用户：填写姓名和电话号注册浏览
```

## 重要目录

```text
index.html      页面结构
styles.css      页面样式
script.js       前端交互和接口调用
server.js       Node.js 后端服务
assets/         首页图片等静态资源
data/db.json    运行后自动生成的数据文件
uploads/        未配置 OSS 时，本地保存上传文件
```

## 阿里云 Windows Server 部署

1. 在服务器安装 Node.js LTS。
2. 把本项目上传到服务器，例如：

```text
C:\qixing-site
```

3. 在 PowerShell 进入目录：

```powershell
cd C:\qixing-site
node server.js
```

4. 浏览器测试：

```text
http://服务器IP:3000
```

5. 阿里云安全组放行 `3000` 端口用于测试。

正式上线时建议用 IIS 或 Nginx 做反向代理，把外部 `80/443` 转发到 `3000`，并配置 HTTPS 证书。

## 后续正式化建议

- 把 `data/db.json` 升级为 MySQL 或 SQL Server
- 增加真实账号密码、密码加密和验证码
- 增加上传审核流程
- 增加操作日志和数据库备份
- 配置 HTTPS 和域名备案
