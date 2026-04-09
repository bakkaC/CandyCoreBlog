---
date: 2026-03-07T16:09:00
---
这个模式主要是多了一步处理输入输出

输入的套路大致是

首先初始化 readline，并让其能够逐行阅读数据

```js
const rl = require("readline").createInterface({ input: process.stdin });
var iter = rl[Symbol.asyncIterator]();
const readline = async () => (await iter.next()).value;
```

一般readline先读一行，根据空格还是逗号使用split进行分割，如果想转为数字就直接map来转换，如果读的就是一个字符串类型的数组或对象直接用json.parse直接转为对象或数组

`let [a, b] = (await readline()).split(' ').map(Number);`