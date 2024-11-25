import { cloneDeep } from 'lodash'

/**
 * @description 判断数组是否为空
 * @param obj 数组
 */
export const judgeEmptyArr = arr => {
  return Array.isArray(arr) && arr.length > 0
}

const list = []
const getRandomNum = digit => {
  return parseInt(Math.random() * Math.pow(10, digit))
}
for (let a = 0; a < 5; a++) {
  const obj1 = {
    id: `${a}`,
    glbm: `${a + 1}大队`,
    gsgl: null,
    sjd: null,
    jtfs: null,
    sgyy: null,
    sgsl: `${getRandomNum(3)}`,
    tb: `${getRandomNum(1)}%`,
    hb: `${getRandomNum(1)}%`,
    child: []
  }
  for (let b = 0; b < 5; b++) {
    const obj2 = {
      id: `${a}-${b}`,
      glbm: `${a + 1}大队`,
      gsgl: `国道20${b}`,
      sjd: null,
      jtfs: null,
      sgyy: null,
      sgsl: `${getRandomNum(3)}`,
      tb: `${getRandomNum(1)}%`,
      hb: `${getRandomNum(1)}%`,
      child: []
    }
    for (let c = 0; c < 5; c++) {
      const obj3 = {
        id: `${a}-${b}-${c}`,
        glbm: `${a + 1}大队`,
        gsgl: `国道20${b}`,
        sjd: `${c}-${c + 2}时`,
        jtfs: null,
        sgyy: null,
        sgsl: `${getRandomNum(3)}`,
        tb: `${getRandomNum(1)}%`,
        hb: `${getRandomNum(1)}%`,
        child: []
      }
      for (let d = 0; d < 5; d++) {
        const obj4 = {
          id: `${a}-${b}-${c}-${d}`,
          glbm: `${a + 1}大队`,
          gsgl: `国道20${b}`,
          sjd: `${c}-${c + 2}时`,
          jtfs: `交通方式${d}`,
          sgyy: null,
          sgsl: `${getRandomNum(3)}`,
          tb: `${getRandomNum(1)}%`,
          hb: `${getRandomNum(1)}%`,
          child: []
        }
        for (let e = 0; e < 5; e++) {
          const obj5 = {
            id: `${a}-${b}-${c}-${d}-${e}`,
            glbm: `${a + 1}大队`,
            gsgl: `国道20${b}`,
            sjd: `${c}-${c + 2}时`,
            jtfs: `交通方式${d}`,
            sgyy: `认定原因${e}`,
            sgsl: `${getRandomNum(3)}`,
            tb: `${getRandomNum(1)}%`,
            hb: `${getRandomNum(1)}%`,
            child: []
          }
          obj4.child[e] = obj5
        }
        obj3.child[d] = obj4
      }
      obj2.child[c] = obj3
    }
    obj1.child[b] = obj2
  }
  list[a] = obj1
}

const list2 = []
for (let a = 0; a < 1000; a++) {
  const obj = {
    id: `${a}`,
    glbm: `${a + 1}大队`,
    gsgl: null,
    sjd: null,
    jtfs: null,
    sgyy: null,
    sgsl: `${getRandomNum(3)}`,
    tb: `${getRandomNum(1)}%`,
    hb: `${getRandomNum(1)}%`
  }
}
export const virtualList = list2

export const listData = list
export const orgListData = cloneDeep(list)
export const colCodeArr = [
  { code: 'glbm', name: '管理部门' },
  { code: 'gsgl', name: '高速公路' },
  { code: 'sjd', name: '时间段' },
  { code: 'jtfs', name: '交通方式' },
  { code: 'sgyy', name: '事故认定原因' }
]
export const colOtherArr = [
  { code: 'sgsl', name: '事故数量' },
  { code: 'swrs', name: '死亡人数' },
  { code: 'ssrs', name: '受伤人数' }
]
export const colOtherObj = {
  '0': [
    { code: 'sgsl', name: '事故数量' },
    { code: 'sgslTb', name: '事故数同比' },
    { code: 'sgslHb', name: '事故数环比' },
    { code: 'swrs', name: '死亡人数' },
    { code: 'swrsTb', name: '死亡人数同比' },
    { code: 'swrsHb', name: '死亡人数环比' },
    { code: 'ssrs', name: '受伤人数' },
    { code: 'ssrsTb', name: '受伤人数同比' },
    { code: 'ssrsHb', name: '受伤人数环比' }
  ],
  '1': [
    { code: 'sgsl', name: '事故数量' },
    { code: 'sgslTb', name: '事故数同比' },
    { code: 'swrs', name: '死亡人数' },
    { code: 'swrsTb', name: '死亡人数同比' },
    { code: 'ssrs', name: '受伤人数' },
    { code: 'ssrsTb', name: '受伤人数同比' }
  ],
  '2': [
    { code: 'sgsl', name: '事故数量' },
    { code: 'sgslHb', name: '事故数环比' },
    { code: 'swrs', name: '死亡人数' },
    { code: 'swrsHb', name: '死亡人数环比' },
    { code: 'ssrs', name: '受伤人数' },
    { code: 'ssrsHb', name: '受伤人数环比' }
  ]
}
export const colOtherCodeArr = colOtherObj['0'].map(item => item.code)
export const rowSpanObj = {
  glbm: [],
  gsgl: [],
  sjd: [],
  jtfs: [],
  sgyy: []
}

/**
 * @description 根据id检索数据
 * @param {array} list 递归数据
 * @param {string} id
 * @param {object} res 检索结果
 */
export const getItemById = (list, { id }) => {
  const res = []
  const reduce = (list, { id, res }) => {
    if (!id) return
    for (const item of list) {
      if (item.id == id) {
        res.push({ ...item })
      } else {
        if (judgeEmptyArr(item.child)) {
          reduce(item.child, { id, res })
        }
      }
    }
  }
  reduce(list, { id, res })
  return res[0]
}

/**
 * @description 根据当前节点id获取其所有祖先id
 * @param {string} id 当前节点id
 * @return {array} 所有祖先id
 */
export const getAllParentIdById = id => {
  const res = []
  const idArr = id.split('-')
  if (idArr.length <= 1) return []
  for (let i = 0; i < idArr.length - 1; i++) {
    if (i == 0) {
      res.push(idArr[i])
    } else {
      const newIdArr = [...idArr]
      newIdArr.length = i + 1
      res.push(newIdArr.join('-'))
    }
  }
  return res
}

/**
 * @description 获取某一项所有同级项
 * @param {array} list 递归数据，初始为原始数据
 * @param {number} level 该项所处的层级
 * @param {number} _level 记录递归到达的层级
 * @param {object} res {count, result} 最后输出的结果，count是子项个数，result是子项集合
 */
export const getSameLevelItems = (list, { targetLevel, currentLevel = 0 }) => {
  let res = []
  if (targetLevel == 1) return (res = [...list])
  const reduce = (list, { targetLevel, currentLevel, res }) => {
    currentLevel += 1
    if (currentLevel > targetLevel) return
    for (const item of list) {
      if (currentLevel == targetLevel) {
        res.push({ ...item })
      } else {
        if (judgeEmptyArr(item.child)) {
          reduce(item.child, { targetLevel, currentLevel, res })
        }
      }
    }
  }
  reduce(list, { targetLevel, currentLevel, res })
  return res
}

const myToString = Object.prototype.toString

/**
 * @description 判断值是否是某个类型
 * @param {unknown} val 判断的值
 * @param {string} type 判断的类型
 * @returns {boolean}
 */
export const isType = (val, type) => {
  return myToString.call(val) === `[object ${type}]`
}

/**
 * @description 判断是否是滚动容器
 * @param {Element} el dom节点
 * @returns {Boolean}
 */
export const isScroller = el => {
  const style = window.getComputedStyle(el, null)
  const scrollValues = ['auto', 'scroll']
  return scrollValues.includes(style.overflow) || scrollValues.includes(style['overflow-y'])
}

/**
 * @description 获取父层滚动容器
 * @param {Element} el dom节点
 * @returns {Element}
 */
export const getParentScroller = el => {
  let parent = el
  while (parent) {
    if ([window, document, document.documentElement].includes(parent)) {
      return window
    }
    if (isScroller(parent)) {
      return parent
    }
    parent = parent.parentNode
  }

  return parent || window
}

/**
 * @description 获取容器滚动位置
 * @param {Element} el dom节点
 * @returns {Number}
 */
export const getScrollTop = el => {
  return el === window ? window.pageYOffset : el.scrollTop
}

/**
 * @description 获取容器高度
 * @param {Element} el dom节点
 * @returns {Number}
 */
export const getOffsetHeight = el => {
  return el === window ? window.innerHeight : el.offsetHeight
}

/**
 * @description 滚动到某个位置
 * @param {Element} el dom节点
 * @param {Number} y 目标位置
 */
export const scrollToY = (el, y) => {
  if (el === window) {
    window.scroll(0, y)
  } else {
    el.scrollTop = y
  }
}


