
从输入 URL 到浏览器把页面渲染出来，大致会经历这几段：

## 1. 解析 URL

浏览器先把 URL 拆开，得到：

- 协议：`https`
    
- 域名：`example.com`
    
- 端口：默认 443
    
- 路径：`/path`
    
- 查询参数：`?a=1`
    
- 片段：`#top`
    

如果地址栏里输入的不是完整 URL，浏览器还会先帮你补全、判断是搜索词还是网址。

## 2. 查找缓存

在真正发请求前，浏览器会先看本地有没有可用资源，比如：

- 强缓存
    
- 协商缓存
    
- DNS 缓存
    
- HSTS 记录
    
- Service Worker 缓存
    

命中缓存的话，可能根本不用走完整网络流程。

## 3. DNS 解析

浏览器需要把域名解析成 IP 地址。

通常会依次查：

- 浏览器 DNS 缓存
    
- 操作系统缓存
    
- 本地 hosts
    
- 路由器缓存
    
- DNS 服务器
    

最后拿到目标服务器 IP。

## 4. 建立连接

### HTTP

如果是老式 HTTP，通常直接基于 TCP 建连接。

### HTTPS

如果是 HTTPS，会多一步 TLS 握手，用来：

- 验证服务器证书
    
- 协商加密算法
    
- 生成会话密钥
    

在这之前，底层还要先做 TCP 三次握手：

- 客户端发 SYN
    
- 服务端回 SYN + ACK
    
- 客户端回 ACK
    

如果是 HTTP/3，则底层不再是 TCP，而是 QUIC/UDP，连接建立方式会不一样，但目标还是一样：可靠传输 + 安全加密。

## 5. 发送 HTTP 请求

连接建立后，浏览器会发送请求报文，例如：

```http
GET /index.html HTTP/1.1
Host: example.com
User-Agent: ...
Accept: text/html
Cookie: ...
```

请求里可能带上：

- Cookie
    
- Accept / Accept-Encoding
    
- Referer
    
- Authorization
    
- 缓存相关头
    
- 各种浏览器自动附加的信息
    

## 6. 服务器处理请求

服务器收到请求后，一般会经过：

- 负载均衡
    
- Web 服务器（Nginx / Apache）
    
- 应用服务器
    
- 数据库 / 缓存 / 微服务
    

然后生成响应内容。

返回给浏览器的响应大概像这样：

```http
HTTP/1.1 200 OK
Content-Type: text/html
Cache-Control: max-age=3600
Set-Cookie: ...
```

响应体里通常是 HTML，也可能是 JSON、图片、CSS、JS 等。

## 7. 浏览器接收响应并开始解析

如果返回的是 HTML，浏览器不会等整个文件完全下载完才开始处理，而是边下载边解析。

这时渲染主流程开始了。

---

# 浏览器渲染过程

## 8. 解析 HTML，构建 DOM

浏览器把 HTML 字符串解析成 DOM 树。

比如：

```html
<html>
  <body>
    <h1>Hello</h1>
  </body>
</html>
```

会变成类似树结构：

- html
    
    - body
        
        - h1
            
            - text
                

DOM 表示文档结构。

## 9. 解析 CSS，构建 CSSOM

浏览器同时会解析：

- 外部 CSS
    
- `<style>` 里的 CSS
    
- 行内样式
    

然后生成 CSSOM（CSS Object Model）。

CSSOM 表示每个节点最终可用的样式规则。

注意：CSS 解析一般不会阻塞 DOM 构建，但会阻塞渲染，因为浏览器要知道元素该长什么样。

## 10. 遇到 JS 时的情况

如果 HTML 解析过程中碰到：

```html
<script src="app.js"></script>
```

默认情况下会：

- 停止 HTML 解析
    
- 下载 JS
    
- 执行 JS
    
- 执行完后再继续解析 HTML
    

因为 JS 可能修改 DOM 结构，比如 `document.write()` 或插入节点。

所以 JS 可能阻塞页面首屏。

常见优化方式：

- `defer`：HTML 解析完后再执行
    
- `async`：下载完成就执行，顺序不保证
    

## 11. 构建渲染树 Render Tree

DOM + CSSOM 合并，形成 Render Tree。

它和 DOM 不完全一样：

- `display: none` 的元素不会进入渲染树
    
- `head` 通常不会进入渲染树
    
- 渲染树里保留的是“要显示什么”
    

## 12. Layout / Reflow：计算布局

浏览器根据渲染树计算每个元素的几何信息：

- 位置
    
- 宽高
    
- 盒模型
    
- 相对谁排列
    

这一步也叫：

- Layout
    
- Reflow
    
- 回流
    

只要元素尺寸、位置、文档流发生变化，就可能触发回流。

## 13. Paint：绘制

布局完成后，浏览器把元素画出来：

- 文字
    
- 颜色
    
- 边框
    
- 阴影
    
- 图片
    

这一步叫重绘。

## 14. Compositing：合成

现代浏览器通常会把页面拆成多个图层，由 GPU 参与合成，最终显示到屏幕上。

比如这些属性常常更容易触发独立图层：

- `transform`
    
- `opacity`
    
- `will-change`
    

所以动画里推荐尽量改 `transform` 和 `opacity`，因为通常只需要合成，不一定触发回流和重绘，性能更好。

---

# 页面不是一次渲染完就结束

首屏显示后，后面还会继续发生很多事：

- JS 执行修改 DOM
    
- 异步请求数据
    
- 图片陆续加载
    
- 字体文件加载后文字重排
    
- 用户交互触发样式变化
    
- 浏览器继续回流、重绘、合成
    

所以渲染是持续过程，不是一次性的。

---

# 可以把整个过程压缩成一条线

## 网络阶段

URL  
→ 缓存检查  
→ DNS 解析  
→ TCP/TLS/QUIC 建连  
→ 发送 HTTP 请求  
→ 服务器返回响应

## 渲染阶段

HTML 解析  
→ DOM  
→ CSS 解析  
→ CSSOM  
→ Render Tree  
→ Layout  
→ Paint  
→ Compositing  
→ 显示到屏幕

---
