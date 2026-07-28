# 七星数智公开一体化云平台

这是七星政务公开网站的可运行版本。当前版本包含：

- 首页六大栏目入口
- 普通用户注册查看政务公开信息
- 普通管理员登录后只能上传和删除本单位信息
- 最高权限管理员可维护单位目录
- Word、PDF、Excel 文件上传
- 公开信息、单位目录、用户登记信息持久化保存到服务器本地 `data/db.json`
- 上传文件保存到 `uploads/`

## 本地运行

```bash
node server.js
```

打开：

```text
http://localhost:3000
```

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
uploads/        上传后的 Word、PDF、Excel 文件
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
