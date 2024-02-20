/**
 * 递归求x的n次方，分析复杂度，如何写出时间复杂度为nlogn的
*/

const fn = (x, n) => {
  if (n === 0) {
    return 1
  }

  return x * fn(x, n - 1)
}
console.log(fn(2, 4))

const fn1 = (x, n) => {
  if (n === 0) {
    return 1
  }

  const t = fn1(x, Math.floor(n / 2))
  if (n % 2 === 1) {
    return t * t * x
  }
  return t * t
}
console.log(fn1(2, 4))
