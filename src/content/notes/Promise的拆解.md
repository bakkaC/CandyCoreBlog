---
description: ""
date: 2025-12-14T14:56
toc_max_heading_level: 4
---
## 源码

```ts
const FULFILLED = "FULFILLED";
const REJECTED = "REJECTED";
const PENDING = "PENDING";

class Promise {
  constructor(executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onResolvedCallbacks = [];
    this.onRejectedCallbacks = [];

    let resolve = (value) => {
      if (this.status === PENDING) {
        this.status = FULFILLED;
        this.value = value;
        this.onResolvedCallbacks.forEach((fn) => fn());
      }
    };
    let reject = (reason) => {
      if (this.status === PENDING) {
        this.status = REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
  
  then(onFulFilled, onRejected) {
  	// 判断`then`传递的值是否缺省-特点1
    onFulFilled = typeof onFulFilled === "function" ? onFulFilled : (v) => v;
    onRejected = typeof onRejected === "function" ? onRejected : (error) => { throw error }
    
    // 每次`then`都会返回一个新的Promise-特点2
    const newPromise = new Promise((resolve, reject) => {
      if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            const x = onFulFilled(this.value);
            this.#resolvePromise(newPromise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
      if (this.status === REJECTED) {
        setTimeout(() => {
          try {
            const x = onRejected(this.reason);
            this.#resolvePromise(newPromise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
      if (this.status === PENDING) {
        this.onResolvedCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onFulFilled(this.value);
              this.#resolvePromise(newPromise, x, resolve, reject);
            } catch (error) {
              reject(error);
            }
          }, 0);
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onRejected(this.reason);
              this.#resolvePromise(newPromise, x, resolve, reject);
            } catch (error) {
              reject(error);
            }
          }, 0);
        });
      }
    });
    return newPromise;
  }

  #resolvePromise(newPromise, x, resolve, reject) {
  	// 如果返回的新Promise和传递的值是同一个引用像会导致循环引用-特点6
    if (newPromise === x) return reject(new TypeError("..."));
    // 防止多次调用-特点4
    let called;
    // x 可能是一个 Promise-特点4
    if ((typeof x === "object" && x !== null) || typeof x === "function") {
      try {
        let then = x.then;
        // 如果`then`是一个函数说明 x 是 Promise-特点5
        if (typeof then === "function") {
          then.call(
            x,
            // 执行成功，将newResolve作为新promise的值-特点5
            (newResolve) => {
              if (called) return;
              called = true;
              // 
              this.#resolvePromise(newPromise, newResolve, resolve, reject);
            },
            // 执行失败，将newReject作为新promise的值-特点5
            (newReject) => {
              if (called) return;
              called = true;
              reject(newReject)
            }
          );
        } else {
          // x 是一个普通值-特点3
          resolve(x);
        }
      } catch (error) {
        // 对`then`中抛出的异常进行处理-特点7
        reject(error);
      }
    } else {
	  // x 是一个普通值-特点3
      resolve(x);
    }
  }

  static resolve(value) {
    // 如果值是一个 Promise 实例，直接返回值就行了，代表这个promise已经完成
    if (value instanceof Promise) {
      return value;
    }
    // 如果值是 thenable 对象（有 then 方法），需要等待它完成
    if (value !== null && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function') {
      return new Promise((resolve, reject) => {
        value.then(resolve, reject);
      });
    }
    // 否则返回一个新的 resolved 状态的 Promise
    return new Promise((resolve) => {
      resolve(value);
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  static reject(reason) {
    return new Promise((_, reject) => {
        reject(reason);
    });
  }

  // 无论如何都会执行的内容。
  // 如果返回Promise则会等待其执行完毕，如果返回成功的Promise会采用上一次的结果，
  // 如果返回失败的Promise，会用这个失败的结果传递到catch中。

  finally(onFinally) {
    return this.then(
      value => Promise.resolve(onFinally()).then(() => value),
      reason => Promise.resolve(onFinally()).then(() => { throw reason; })
    );
  }

  static all(promises) {
    if (!Array.isArray(promises)) return new TypeError("...");
    return new Promise((resolve, reject) => {
        const res = [];
        let counter = 0;
        
        const processResultByKey = (value, index) => {
            res[index] = value;
            counter++;
            if (counter === promises.length) return resolve(res);
        };

        for (let i = 0; i < promises.length; i++) {
            if (promises[i] && typeof promises[i].then === "function") {
                promises[i].then((value) => {
                    processResultByKey(value, i);
                }, reject);
            } else {
                processResultByKey(promises[i], i);
            }
        }
    });
  }

  static race(promises) {
    if (!Array.isArray(promises)) return new TypeError("...");
    return new Promise((resolve, reject) => {
        for (let i = 0; i < promises.length; i++) {
            if (promises[i] && typeof promises[i].then === "function") {
                promises[i].then(resolve, reject);
            } else {
                resolve(promises[i]);
            }
        }
    });
  }

  static allSettled(promises) {
    if (!Array.isArray(promises)) return new TypeError("...");
        return new Promise((resolve, reject) => {
            const res = [];
            let counter = 0;
            for (let i = 0; i < promises.length; i++) {
                Promise.resolve(promises[i]).then((value) => {
                    res[i] = { status: FULFILLED, value };
                })
                .catch((reason) => {
                    res[i] = { status: REJECTED, reason };
                })
                .finally(() => {
                    counter++;
                    if (counter === promises.length) resolve(res);
                });
            }
        });
    }
}
```

## 核心要点

### 函数队列+状态机延时控制

Promise对象是一个状态机，他的一个状态值，绑定了他的一些数据（value/reason，cbQueue）

then中的函数放在队列中存储，等待状态满足时再调用队列内容，状态相当于一个锁，把action锁住了

### then的职责



在 Promise 的设计中，`.then()` 方法远不止是一个简单的回调注册器。它承担了 Promise 规范中多个至关重要的职责，这些职责共同确保了 Promise 链的可靠性、可组合性和错误处理能力。

以下是 `.then()` 在 Promise 规范中的核心职责总结：

#### 1. 状态订阅与回调注册 (Subscription)

这是最基本的功能。`.then()` 接受最多两个参数：

* `onFulfilled`：当前 Promise 解决 (Fulfilled) 时要执行的回调函数。

* `onRejected`：当前 Promise 拒绝 (Rejected) 时要执行的回调函数。

#### 2. 创建并返回新的 Promise (Chaining)

这是实现 Promise **链式调用**的关键。无论原始 Promise 的状态如何，也无论您是否提供了回调函数，`.then()` 都会**立即返回一个新的 Promise 实例**。

JavaScript

```plain&#x20;text
const promise1 = new Promise(resolve => resolve(1));

// promise2 是一个新的 Promise 实例，而不是 promise1const promise2 = promise1.then(value => value + 1); 

// promise3 又是另一个新的 Promise 实例const promise3 = promise2.then(value => console.log(value)); // 输出 2
```

这个新 Promise (`promise2`) 的状态和结果，将完全由 `.then()` 中**回调函数的执行结果**决定（见职责 4 和 5）。

#### 3. 值和错误传递（穿透/Projection）

如果 `.then()` 中省略了其中一个回调（例如，只提供了 `onFulfilled` 而没有提供 `onRejected`），`.then()` 必须确保值或错误能够**穿透**到链中的下一个 Promise。

* **值穿透：** 如果 Promise 成功，但您没有提供 `onFulfilled`，则前一个 Promise 的成功值会直接作为 `promise2` 的成功值。

* **错误穿透：** 如果 Promise 失败，但您没有提供 `onRejected`（例如，您使用的是 `.then(onFulfilled)`），则前一个 Promise 的拒绝原因会直接作为 `promise2` 的拒绝原因。

正是这个机制允许您在 Promise 链的**末尾**使用一个 `.catch()` (等价于 `.then(null, onRejected)`) 来捕获链中任何位置发生的错误。

#### 4. 结果处理和转换 (Transformation)

这是 `.then()` 最强大的功能。它定义了如何将前一个异步操作的结果，转换为下一个异步操作所需的输入。

Promise 规范对回调函数 `onFulfilled` 的返回值 `x` 有严格的处理规则（称为 **Promise 解决过程 `[[Resolve]](promise2, x)`**）：

* **返回普通值：** 如果 `onFulfilled` 返回一个普通值（非 Promise），则 `promise2` 将以这个值作为成功结果解决 (Fulfilled)。

* **返回 Promise：** 如果 `onFulfilled` 返回另一个 Promise 实例 `p`，则 `promise2` 将被锁定，其状态和结果会**与 `p` 的状态和结果保持一致**。这实现了异步操作的扁平化。


**Promise Resolution Procedure**，是 Promise/A+ 规范中定义的核心算法。这个解决过程是一个递归、尝试性的过程，其目的是为了 **"拉平" (flatten) 任何深层嵌套的 Promise 或 Thenable**，直到找到一个普通值或一个真正的错误。

Promise Resolution Procedure 的“扁平化”，是为了保证：

Promise 链始终是“一层一层的数据流”，而不会变成“嵌套的未来”。

如果 Promise 不扁平化，状态会被嵌套的promise隐藏，整个异步数据流模型直接不可用。

状态判断彻底失真：

`p.then(() => Promise.resolve(42))
 .then(v => console.log(v));`



❌ 不扁平：

* 第二个 `then` 拿到的是：
* `v === Promise<42>`
* 用户必须手动 `.then`
* &#x20;**每一步都变复杂，链式模型崩溃**

| 步骤  | 条件                          | 对 Promise 的影响                          | 结果                                        |
| --- | --------------------------- | -------------------------------------- | ----------------------------------------- |
| 1   | 循环检查：x === promise          | 如果成立，视为自我解析（self-resolution）错误         | Promise 被以 TypeError 拒绝                   |
| 2   | Promise：x 是一个 Promise 实例    | Promise 进入“采纳”流程，锁定为 x 的状态             | 新 Promise 的状态与 x 同步，结果为 x 的结果或拒因          |
| 3   | Thenable：x 是对象/函数且有 then 方法 | 尝试调用 x.then（可能异步），其行为决定新 Promise 的最终状态 | 新 Promise 的状态由 then 的回调（resolve/reject）决定 |
| 4   | 基础值：x 为普通值（非对象或无 then）      | 视为普通值，立即完成解析                           | Promise 立即以 x 为值被 fulfilled               |

这个机制是 `async/await` 能够正常工作的底层支撑：当你在 `async` 函数中 `return new Promise(...)` 时，外部的 `async` 函数返回的 Promise 就会通过这个解决过程，采纳你返回的内部 Promise 的状态。


#### 5. 错误捕获和转换 (Error Conversion)

`.then()` 能够将同步世界中的错误，无缝地转换为异步世界的错误状态。

* 如果 `onFulfilled` 或 `onRejected` 在执行过程中，使用 `throw new Error(...)` 抛出**同步异常**，那么 `.then()` 返回的**新 Promise (`promise2`) 将立即进入 `Rejected` 状态**，拒绝原因就是抛出的错误对象。

这使得 `Promise` 链中的错误处理与同步 `try...catch` 一样自然，从而支持了 `async/await` 中 `try...catch` 的底层实现。


异步错误处理的通用逻辑在于：

如何将发生在非主线程或未来时机的错误可靠的传递回主线程的执行流程

也就是给主线程同步执行的回调函数

这是因为错误处理所需要的执行上下文只在主线程中存在

错误处理需要主线程的执行上下文，因为它需要：

> 1. **安全地**读取和修改应用程序的**共享状态**（如变量和 DOM）。
>
> 2. 利用 JavaScript **单线程模型**的优势，**避免**复杂的**数据竞争**和锁机制。
>
> 3. **正确地**与运行时环境进行交互，**生成准确的栈跟踪**并触发**全局错误报告**。



因此，**Promise 的 `.catch()` 就是一个异步机制，它负责将异步世界中发生的错误（通过 `reject` 状态）转化为一个可供主线程安全、同步执行的错误处理回调（通过微任务）的 Trigger。**

他对应同步世界的catch，也能实现类似同步世界的跳转逻辑

只不过同步世界的catch，可以直接由运行时检测到异常，将控制流转移到 `catch` 块。

而promise的catch是通过内部创建的对象，显示传递rejected状态和reason，最终传递到catch里，catch可以接收一个函数，类似同步的catch中的错误处理逻辑，进行错误处理

而catch为什么由then实现呢，因为catch本身就是捕捉reject状态，执行reject队列中回调函数的行为，并且我们还需要更灵活的组合控制（即catch之后还能恢复resolve链式调用），那么就和then的行为完全一致了

所以then其实还有错误处理的职责

### 对象类型的判断和控制

```js
/**
 * 判断一个值是否是 thenable
 * @param {*} value - 需要判断的值
 * @returns {boolean} - 是否是 thenable
 */
function isThenable(value) {
  // 1. value 不能是 null
  // 2. value 必须是对象 (object) 或 函数 (function)
  // 3. value.then 必须是一个函数
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof value.then === 'function'
  );
}

// if (value instanceof Promise) 判断是否是promise
// if (newPromise === x) 判断是否是本身
// ...
```

可以参考[对象的深度遍历](八股/对象的深度遍历.md)

### API的语义

resolved/rejected：

`Promise.resolve(x)`:

> 将x转换为一个可链式调用的 Promise

规则：

- Promise 实例 (value instanceof Promise)
    
    - 语义：已经是你实现的 Promise，直接返回可以保持同一实例的状态与链式行为（避免不必要地再包一层）。
    - 效率：避免额外的封装与异步调度开销。
- thenable（有 then 方法的对象）
    
    - 语义互操作：第三方库可能返回“类似 Promise”的对象（thenable），规范要求把它“同化”（assimilation）——也就是订阅它的 then，把外层 Promise 的状态跟随它的最终状态。
    - 安全与正确性：需要在读取/调用 then 时做 try/catch，并用 called 标志防止多次决议，递归同化嵌套 thenable，检测循环引用等。单纯把 thenable 当普通值会导致链式语义失效（得到的是容器而非最终值）。
- 其他普通值（undefined、数字、对象但无 then、函数但无 then 等）
    
    - 语义：这些就是最终值，直接创建并返回一个已 resolved 的 Promise，把该值透传给后续 then。

`Promise.reject(reason)`

> 返回一个新的 rejected 状态的 Promise


catch：

> **只关心 rejected 分支的 then**

没有新能力，只是：

- 提高可读性
- 明确“这里是错误处理 / 恢复点”

finally：

注册一个无论如何都会执行的回调
注册回调：then方法
无论如何都会执行：即无论resolved还是rejected都会执行
可继续链式调用：返回promise，即使用resolved API

```js
  finally(onFinally) {
    return this.then(
      value => Promise.resolve(onFinally()).then(() => value),
      reason => Promise.resolve(onFinally()).then(() => { throw reason; })
    );
  }
```


all:

实际语义

> **“并行收集器” + “短路失败”**

语义规则：

- 所有 fulfilled → fulfilled(结果数组)
- 任意一个 rejected → 立刻 rejected

👉 关注的是：
- **整体是否完整成功**

结果收集函数：将结果按照指定顺序传入结果数组，维护计数器来判断是否收集完毕，收集完了就resolve(res);

返回一个promise
executor：
- 遍历promise数组，是promise就注册结果收集函数，作为回调，将父promise的reject作为当前promise的on rejected来传入
- 是普通类型直接调用收集结果函数
- 这样只有收集完成了，才会调用resolve(res)来resolve父promise

race和allsetted的细节也很好理解了

`Promise.allSettled(iterable)`

实际语义

> **“并行状态收集器”**

- 不关心成功失败
- 只关心“都结束了没”

结果是：

`{ status, value | reason }`


`Promise.race(iterable)`

实际语义

> **谁先 settle 就采用谁**

- fulfilled / rejected 都算
- 常用于：
    - 超时控制
    - 首响应

### Promise包装作用

他能给一个函数或者一段代码一个成功或者结束的状态标志