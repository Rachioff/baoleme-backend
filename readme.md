构建并启动容器

```bash
docker --help
docker-compose --help
# 使用Docker Compose
docker-compose up --build -d
# 或直接使用Docker命令
docker build -t node-app .
docker run -d -p 3000:3000 --name my-node-app node-app
# 本地测试访问（确保服务器防火墙开放3000端口）
curl http://localhost:3000
# 查看容器日志
docker-compose logs -f
```
## 启用日志检测
```bash
docker-compose logs -f minio postgres
```
## 在云服务器上安全地开放 MinIO 和 PostgreSQL 服务给团队成员访问，需要完成以下关键配置步骤：

一、基础网络配置
1. 确认端口映射
确保 docker-compose.yml 已正确映射端口：
```yml
services:
  minio:
    ports:
      - "9000:9000"  # API 端口
      - "9001:9001"  # 控制台端口

  postgres:
    ports:
      - "5432:5432"  # 数据库端口
```
2. 云服务器安全组配置
在云控制台配置安全组规则（以阿里云/ AWS 为例）：

​​允许特定端口​​：开放 9000(MinIO API)、9001(MinIO Console)、5432(PostgreSQL) 端口
​​限制访问源IP​​：仅允许团队成员的公共 IP 或公司网络 IP 段（建议）
> 示例：仅允许 203.0.113.0/24 IP 段访问
类型: 自定义 TCP
端口范围: 9000,9001,5432
授权对象: 203.0.113.0/24
3. 服务器防火墙放行
确保宿主机防火墙允许流量：
```bash
# UFW (Ubuntu)
sudo ufw allow 9000/tcp
sudo ufw allow 9001/tcp
sudo ufw allow 5432/tcp

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-port={9000,9001,5432}/tcp
sudo firewall-cmd --reload
```
## ssh
```bash
# 建立隧道（将本地5432映射到远程数据库）
ssh -L 5432:localhost:5432 user@your-server-ip

# 团队成员连接时使用：
Host: localhost
Port: 5432
```

## MinIO 使用
[MinIO SDK Document](https://min.io/docs/minio/linux/developers/minio-drivers.html#javascript-sdk)
```bash
npm install --save-dev @types/minio
```
然后就开始导入，调用SDK

浪费昨晚2小时鼓捣，原来是冲突导致容器中的nginx没有正确监听端口

443 端口冲突，主机有运行nginx

分析：容器内可以正常通讯，但是在主机内不能访问代理路径——所以是nginx没有正常工作——配置有问题，没有生效——检查系统网络
```bash
docker exec home_nginx_1 nginx -t 
sudo lsof -i :80
sudo systemctl stop nginx 
curl http://localhost:8080/minio/

docker-compose down  
docker-compose up -d

curl ifconfig.me 
182.92.239.175#
```

服务端网络配置正确，curl反应合理。但是连接超时——应该是OS防火墙和云服务商端口开放的原因