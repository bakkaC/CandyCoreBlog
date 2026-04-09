---
description: ""
date: 2025-12-14T13:51
toc_max_heading_level: 4
---
最近读代码的时候巧合频繁看到了js中对并发相关控制的思路，都有些不同，但又有相似之处，直觉告诉我可以总结出一些东西

## 函数队列

手撕过promise的人都知道他内部维护了两个队列，这是我第一次学到相关的思路

promise的想法是，根据状态的值，延迟操作的执行，只有状态为fulfilled时，then中的函数才能执行，两个队列一个存储处理rejected的情况的函数，一个则是处理resolved的情况的函数，不同情况执行不同的队列中的函数

这里巧妙的地方是，如何延迟执行一个函数？——==把函数对象存储在队列里==，使用一个状态值充当一个锁，当锁到达特定的状态时，执行队列中的函数

函数队列带来许多可能性
这就使得操作调度更灵活了，本质上是把“**要做什么**”和“**什么时候做 / 谁来做**”解耦。

当你把函数放进队列时，你并没有执行它，而是：
> **把一段行为描述，存起来，等合适的时机再执行**

没有队列的情况：

```
doA();
doB();
doC();
```

- 执行顺序写死
- 无法动态插队、暂停、重试
- 生产行为 = 执行行为

将函数存储在队列里，带来的核心好处是 **“控制反转”（Inversion of Control）**。

- **普通调用**：func() -> 立刻执行，不可阻挡，不可改变。
- **队列调用**：queue.push(func) -> **我把你交出来了**。至于你什么时候运行、要不要运行、运行前后要不要加点料、是不是要和别的函数合并运行，**由调度器（Scheduler）说了算**。

这使得你的代码从“命令式”变得更加“声明式”和健壮。

#### 1. 时间解耦 (Temporal Decoupling)

- **观点**：**生产者（调用者）不需要关心消费者（执行者）是否准备好。**
    
- **场景**：
    
    - **Google Analytics (GA) 的经典实现**：你在网页里看到的 _gaq.push(['_trackPageview'])。这里的 _gaq 起初只是一个普通的数组。哪怕 GA 的核心 JS 库还没加载完，用户操作也不会报错，只是被存进数组里。等核心库加载完毕，它会接管这个数组，把里面堆积的函数挨个执行。
        
    - **本质**：利用队列消除加载时序依赖，实现“惰性初始化”。
        

#### 2. 行为的组合与拦截 (Composition & Interception)

- **观点**：**函数队列是中间件（Middleware）模式的基石。**
    
- **场景**：
    
    - **Koa / Express / Redux 中间件**：这些框架内部维护了一个函数队列（通常称为 middleware chain）。
        
    - **带来的好处**：你可以在一个操作执行前（入队前）或执行后（出队时），插入无数个“切面”（AOP）。比如记录日志、权限校验、异常处理。
        
    - **本质**：通过队列将线性逻辑拆解成可插拔的模块，实现**洋葱模型**或**管道模式**。
        

#### 3. 批量处理与并发优化 (Batching & Throttling)

- **观点**：**将离散的“点”聚合成“块”，减少昂贵的副作用。**
    
- **场景**：
    
    - **React 的 setState / Vue 的 nextTick**：当你连续调用多次状态更新时，框架不会立刻更新 DOM，而是把这些更新函数推入队列。在当前宏任务结束前，合并所有变更，只操作一次 DOM。
        
    - **本质**：利用队列作为缓冲区（Buffer），以空间换时间，减少重绘回流带来的性能损耗。
        

#### 4. 可撤销与事务管理 (Undo/Redo & Transactions)

- **观点**：**如果操作是数据，那么操作就可以被“丢弃”或“重放”。**
    
- **场景**：
    
    - **命令模式 (Command Pattern)**：如果你把每一个用户操作（如“删除一行文本”）封装成一个函数存入 historyQueue，那么“撤销”就是从队列里弹出，或者回滚状态后重放队列中剩下的 N-1 个函数。
        
    - **本质**：将“动作”历史化，使得系统状态可回溯。


## 我遇到的一些例子

### promise——时间解耦

[Promise的拆解](Promise的拆解.md)

### setState —— 批处理执行

[setState的机制](simplified-setstate.md)
### 批量裁剪——并发控制和限流

[图像批量裁剪](../../thoughts/图像批量裁剪的性能优化.md)

这里的实现创建一个excuting队列，去统计执行中的函数的数量，从而限制总任务数

### chatbox中的队列（回放撤销，中间件）



### 洋葱模型

洋葱模型（Koa 风格）之所以被认为是 JavaScript 中间件机制的“最优解”，本质原因在于：
- **它在异步环境中恢复了完整、可回溯的调用栈，从而让一次请求形成真正的“逻辑闭环”**。
- 相较于 Express 线性模型中 `next()` 一去不回、执行栈断裂所带来的上下文割裂、错误处理分散、响应不可拦截等问题
- 洋葱模型通过 `async/await + next()` 构建出一条连续的 Promise 链，使中间件在“请求进入”和“响应返回”两个阶段同时拥有控制权。
- 结果是：
	- 前置与后置逻辑天然对称、错误可以像同步代码一样向外冒泡并被最外层统一捕获、下游生成的响应结果可以被上游安全地读取和二次加工。

- 换句话说，洋葱模型并不是引入了更多机制，而是**用最小的语法成本，把异步流程重新拉回到人类最直觉的同步调用模型中**，这正是它优于线性模型、并长期成立为最优解的根本原因。

控制流交替的机制最小实现：

```ts
class MiniKoa {
  constructor() {
    this.middlewares = []; // 1. 存放中间件的队列
  }

  use(fn) {
    this.middlewares.push(fn); // 注册中间件
  }

  // 核心引擎：组合函数 (Compose)
  compose(ctx) {
    const dispatch = (i) => {
      // 获取当前中间件，如果没有了就返回 resolved promise
      const fn = this.middlewares[i];
      if (!fn) return Promise.resolve();

      // 执行当前中间件 fn(ctx, next)
      // 关键点：next 参数本质上就是递归调用 dispatch(i + 1)
      return Promise.resolve(
        fn(ctx, function next() {
          return dispatch(i + 1);
        })
      );
    };

    return dispatch(0); // 从第 0 个开始启动
  }
}
```

这段代码之所以能跑出洋葱模型，秘密全在 dispatch 函数里的这一行：

```
fn(ctx, function next() {
    return dispatch(i + 1);
})
```

这里的逻辑闭环是：

1. **控制权转交**：当你写 await next() 时，你实际上是在执行 await dispatch(i + 1)。 
2. **递归暂停**：await 会等待 dispatch(i + 1) 返回的 Promise 完成。
3. **链式传递**：dispatch(i + 1) 又会去调用中间件 i+1，直到最后一个中间件。
4. **回溯（Rebound）**：当最里面的中间件执行完（或者没调用 next），它的 Promise 变成了 resolved。
5. **解冻**：此时，上一层的 await next() 终于等到了结果，于是代码继续**向下执行**（执行 next() 后面的代码）。


```ts
const app = new MiniKoa();

// 中间件 1 (最外层)
app.use(async (ctx, next) => {
  console.log('1. 洋葱皮 (入)');
  ctx.val += 'A';
  await next(); // --> 暂停，进入下一层
  ctx.val += 'E';
  console.log('5. 洋葱皮 (出)');
});

// 中间件 2 (中间层)
app.use(async (ctx, next) => {
  console.log('2. 洋葱肉 (入)');
  ctx.val += 'B';
  await next(); // --> 暂停，进入下一层
  ctx.val += 'D';
  console.log('4. 洋葱肉 (出)');
});

// 中间件 3 (最核心)
app.use(async (ctx, next) => {
  console.log('3. 洋葱心 (核心逻辑)');
  ctx.val += 'C';
  // 这里没有 next() 了，开始回溯
});

// 启动运行
const context = { val: '' };
app.compose(context).then(() => {
  console.log('\n执行完毕，Context 结果:', context.val);
});
```



#### 1. 连续的上下文

在 Express 中，中间件是一个单向链表。你调用 next()，控制权就交出去了，**再也回不来了**。
如果你想统计一个接口的耗时，你必须这就么写：

```ts
// Express 写法
const start = Date.now();
// 1. 并没有 await next()，必须依赖事件监听
res.on('finish', () => {
  const ms = Date.now() - start;
  console.log(`耗时: ${ms}ms`);
});
next();
```

- **问题**：逻辑是割裂的。你必须通过监听 res 的事件或者 hack res.end 方法才能在“请求结束后”做点事情。这破坏了代码的连续性。


洋葱模型利用 async/await 实现了栈的**暂停与恢复**。

```ts
// Koa 写法
const start = Date.now();
// 1. 暂停！先把控制权交下去，等下面所有人干完活
await next(); 
// 2. 恢复！下面的人干完了，控制权回到我手里，原来的 start 变量还在！
const ms = Date.now() - start;
console.log(`耗时: ${ms}ms`);
```

- **优势**：**上下文（Context）是连续的**。你不需要把逻辑拆分成“前置”和“后置”两个中间件，也不需要监听事件。一段代码同时拥有了“请求进入时”和“响应返回时”的控制权。

#### 2. 错误处理的终极形态：Bubble up（冒泡）

在 Express 中，错误处理非常痛苦。因为 next() 是同步调用或者异步回调，栈已经断了。你不能在外层用 try-catch 捕获内层的异步错误。  
你必须定义一个专门的错误处理中间件 (err, req, res, next) 放在最后，并且要求所有人在出错时必须显式调用 next(err)。

koa的解法：

因为 await next() 构建了一条完整的 Promise 链，**内部抛出的任何错误，都会沿着洋葱皮一层层向外冒泡**。

你只需要在**最外层**写一个中间件：

```ts
// 最外层的护盾
app.use(async (ctx, next) => {
  try {
    await next(); // 大胆去跑，里面哪怕炸了天，我也兜得住
  } catch (err) {
    // 统一处理所有层级的错误
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
    // 甚至可以记录错误日志，或者发报警
    logger.error(err);
  }
});
```

- **优势**：**错误处理的中心化**。你不再需要在每个业务逻辑里小心翼翼地 try-catch，只需要在最顶层放一张网。

---

#### 3. 对“响应结果”的拦截能力

在 Express 中，一旦某个中间件调用了 res.send()，响应就直接发给浏览器了。上层中间件很难再把数据拿回来修改（比如做 Gzip 压缩，或者统一包装 JSON 格式）。

在 Koa 中，数据不是直接发走的。大家是把数据赋值给 ctx.body。  
当 await next() 返回时，上层中间件**可以看到下层处理的结果**，并且**修改它**。

```ts
// 一个统一包装响应格式的中间件
app.use(async (ctx, next) => {
  await next(); // 先让业务逻辑跑，生成数据
  
  // 此时 ctx.body 可能是 { name: 'Jack' }
  // 我可以拦截它，包装一层结构
  ctx.body = {
    code: 200,
    data: ctx.body,
    timestamp: Date.now()
  };
});
```

- **优势**：**后处理（Post-processing）能力**。这让实现“全局数据转换”、“Gzip压缩”、“统一签名”变得极其简单。

这就是**函数队列**配合**递归**与**Promise** 产生的魔法：**将线性队列折叠成了嵌套结构的洋葱。**