// 冒泡排序函数
function bubbleSort(arr) {
  // 获取数组的长度
  var len = arr.length
  // 外层循环，控制比较的轮数
  for (var i = 0; i < len - 1; i++) {
    // 内层循环，控制每轮比较的次数
    for (var j = 0; j < len - 1 - i; j++) {
      // 如果前一个数大于后一个数，则交换位置
      if (arr[j] > arr[j + 1]) {
        var temp = arr[j + 1]
        arr[j + 1] = arr[j]
        arr[j] = temp
      }
    }
  }
  return arr
}

const res = bubbleSort([3, 1, 5, 4, 2])
console.log(res) // [1, 2, 3, 4, 5]