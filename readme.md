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
