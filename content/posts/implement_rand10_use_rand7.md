---
title: "Implement_rand10_use_rand7"
date: 2021-09-05T14:50:20+08:00
draft: false
---

# 使用rand7实现rand10

题目：

```
已有方法 rand7 可生成 1 到 7 范围内的均匀随机整数，试写一个方法 rand10 生成 1 到 10 范围内的均匀随机整数。

不要使用系统的 Math.random() 方法。



来源：力扣（LeetCode）
链接：https://leetcode-cn.com/problems/implement-rand10-using-rand7
著作权归领扣网络所有。商业转载请联系官方授权，非商业转载请注明出处。
```

结论：

1. (RAND_X - 1) * Y + RAND_Y = RAND_X*Y
2. RAND_X*Y % Y + 1 = RAND_Y



证明结论1：

使用rand2生成rand4

使用 rand2_Row + rand2_Col 生成的随机数为：

| Col\Row| 1 | 2 |
|--- | --- |---- |
| 1 | 2 | 3 |
| 2 | 3 | 4 |

结果生成的范围为[2,4]

然后我们缩小结果的范围，用 rand2_Row - 1 替换 原来式子中的 rand2_Row，上面的式子就变成了：(rand2_Row - 1) + rand2_Col

| Col\Row| 0 | 1 |
|--- | --- |---- |
| 1 | 1 | 2 |
| 2 | 2 | 3 |

结果生成的范围为[1,3]。但显然结果出现的概论并不是平均的，1，3的概率分别为25%，2的概率最大，为50%。

之后我们使用 (rand2_Row - 1) * 2 + rand2_Col

| Col\Row| 0 | 1 |
|--- | --- |---- |
| 1 | 1 | 3 |
| 2 | 2 | 4 |

(1,2,3,4)出现的结果为均衡的概率。

之后将结论带入(rand2 - 1) * 3 + rand3 == rand6

| Col\Row| 0 | 1 |
|--- | --- |---- |
| 1 | 1 | 4 |
| 2 | 2 | 5 |
| 3 | 3 | 6 |

证明结论2：

rand4 % 2 + 1 = rand2

- 1 % 2 + 1 = 2
- 2 % 2 + 1 = 1 
- 3 % 2 + 1 = 2 
- 4 % 2 + 1 = 1

题目：

使用rand7生成rand10

我们可以使用第一个结论

(rand7 - 1) * 7 + rand7 = rand49

因为rand49不是rand10的倍数，所以我们要抛弃[41, 49]之间的数字：

```go
func rand10() int {
    for {
        num := (rand7() - 1) * 7 + rand7()
        if num <= 40 {
            return num % 10 + 1
        }
    }
}
```

这种结论的最坏情况可能会超时，num > 40。所以进行优化，缩小不属于10的整数倍的范围：

```go
func rand10() int {
    for {
        num := (rand7() - 1) * 7 + rand7() // rand49
        if num <= 40 {
            return num % 10 + 1
        }
        
        a := num % 40 // rand9
        b := rand7()
        num = (a - 1) * 7 + b // rand63
        if num <= 60 {
            return num % 10 + 1
        }
        
        a = num % 60 // rand3
        b = rand7()
        num = (a - 1) * 7 + b // rand21
        if num <= 20 {
            return num % 10 + 1
        }
    }
}
```

