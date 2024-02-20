var findMedianSortedArrays = function (nums1, nums2) {
  const len1 = nums1.length
  const len2 = nums2.length
  const len = len1 + len2
  const res = []
  let i = 0
  let j = 0
  while (i < len1 || j < len2) {
    if (nums1[i] < nums2[j]) {
      res.push(nums1[i++])
      continue
    }
    if (nums1[i] >= nums2[j]) {
      res.push(nums2[j++])
      continue
    }
    if (i >= len1 && j < len2) {
      res.push(nums2[j++])
    }
    if (j >= len2 && i < len1) {
      res.push(nums1[i++])
    }
  }
  const flag = len % 2 !== 0
  const index = Math.floor((len - 1) / 2)
  return flag ? res[index] : (res[index] + res[index + 1]) / 2
}

const arr1 = [1, 2]
const arr2 = [3, 4]
console.log(findMedianSortedArrays(arr1, arr2))
