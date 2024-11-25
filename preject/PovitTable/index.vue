<template>
  <div class="AnalysisTable-container">
    <a-spin class="spin-loaing" v-if="loading" :tip="loadTip"></a-spin>
    <template>
      <a-table
        v-if="headers.dimensions.length && !loading && listData.length"
        class="result-table"
        v-bind="$attrs"
        :columns="columns"
        :bordered="true"
        :pagination="false"
        :dataSource="dataSource"
        :scroll="{ x: xScroll, y: 10 }"
        :rowKey="rowKey"
      />
      <div class="ant-table-append" ref="append" v-show="!isHideAppend">
        <slot name="append"></slot>
      </div>
    </template>
  </div>
</template>

<script>
import { cloneDeep, throttle } from 'lodash'
import {
  judgeEmptyArr,
  isType,
  getItemById,
  getAllParentIdById,
  getSameLevelItems,
  getParentScroller,
  getScrollTop,
  isScroller,
  getOffsetHeight
} from './util.js'
import { message } from '@evo-web/hua-design-vue'

export default {
  name: 'PovitTable',
  props: {
    appName: {
      type: String,
      default: 'ant'
    }, // 当前应用使用应用名称做less沙箱隔离样式时传入
    xScroll: {
      type: Number,
      default: 1000
    }, // 当前应用使用应用名称做less沙箱隔离样式时传入
    loading: {
      type: Boolean,
      default: false
    }, // 加载状态
    loadTip: {
      type: String,
      default: '加载中...'
    }, // 加载提示
    treeData: {
      type: Array,
      default: () => []
    }, // 树数据
    headers: {
      type: Object,
      default: () => ({
        dimensions: [],
        results: []
      })
    }, // 表头，由两部分组成，维度+数据结果
    rowKey: {
      type: String,
      default: 'id'
    },
    onLoad: {
      type: Function,
      default: undefined
    }, // 异步加载数据方法，必须是Promise且输出结果
    buffer: {
      type: Number,
      default: 50
    }, // 虚拟滚动上下缓冲区域，默认50条
    throttleTime: {
      type: Number,
      default: 10
    }, // 滚动事件节流时间
    keyProp: {
      type: String,
      default: 'id'
    }, // key值，列表数据唯一键
    itemSize: {
      type: Number,
      default: 45
    }, // 预估列表每行高度
    virtualSize: {
      type: Number,
      default: 10
    } // 是否开启虚拟滚动
  },
  components: {},

  data() {
    return {
      isHideAppend: false,
      start: 0, // 可视区域第一个元素索引
      end: undefined, // 可视区域最后一个元素索引
      renderCount: 0, // 可视区域内可以渲染的行数
      sizes: {}, // 尺寸
      listData: [], // 铺平的列表数据
      renderData: [], // 实际渲染的列表数据
      orgListData: [], // 原始树状数据
      rowSpanObj: {}, // 原始rowSpan对象，其中每一项的属性名与表头字段对应
      backRowSpanObj: {},
      renderRowSpanObj: {}, // 实际使用的rowSpan对象
      openLoading: false, // 节点展开时的loading状态
      openLevel: 0, // 展开节点所处层级（列）
      openId: '', // 展开节点id
      rowSize: 45, // 预估行高
      initColumns: function(arr) {
        return arr.map((item, i) => {
          const { code, key, name, getContent, width } = item
          return {
            title: name,
            dataIndex: code,
            width: width || 180,
            customRender: (text, record, index) => {
              record[`${key}Open`] = !!record[`${key}Open`]
              let content = ''
              if (isType(getContent, 'Function')) {
                content = getContent(record)
              } else {
                content = text
              }
              // 该节点loading状态
              const loading = this.openLoading && this.openId === record.id && this.openLevel == i + 1
              return {
                children:
                  content || content == '0' ? (
                    <div class="opt-box flex-box-align-center">
                      {this.checkShowOpenIcon(record, i) ? (
                        loading ? (
                          <span class="opt-icon">
                            <a-icon type="loading" />
                          </span>
                        ) : (
                          <span class="opt-icon" onClick={() => this.handleOpen(record, { index, key, level: i + 1 })}>
                            {record[`${key}Open`] ? <a-icon type="caret-down" /> : <a-icon type="caret-right" />}
                          </span>
                        )
                      ) : (
                        ''
                      )}
                      <a-tooltip placement="top">
                        <template slot="title">
                          <span class="table-span"> {content} </span>
                        </template>
                        <span class="table-span"> {content}</span>
                      </a-tooltip>
                    </div>
                  ) : this.checkShowOpenIcon(record, i) ? (
                    loading ? (
                      <span class="opt-icon">
                        <a-icon type="loading" />
                      </span>
                    ) : (
                      <span class="opt-icon" onClick={() => this.handleOpen(record, { index, key, level: i + 1 })}>
                        {record[`${key}Open`] ? <a-icon type="caret-down" /> : <a-icon type="caret-right" />}
                      </span>
                    )
                  ) : (
                    ''
                  ),
                attrs: Array.isArray(this.rowSpanData[key]) ? { rowSpan: this.rowSpanData[key][index] } : {}
              }
            }
          }
        })
      }
    }
  },

  computed: {
    dataSource() {
      return this.listData.length > this.virtualSize ? this.renderData : this.listData
    },
    rowSpanData() {
      return this.listData.length > this.virtualSize ? this.renderRowSpanObj : this.rowSpanObj
    },
    columns() {
      const { dimensions, results } = this.headers
      return this.initColumns([...dimensions, ...results])
    },
    // 是否异步加载数据
    isLoad() {
      return isType(this.onLoad, 'Function')
    },
    TableBodyClassNames() {
      const appName = this.appName
      return [
        `.${appName}-table-scroll .${appName}-table-body`,
        `.${appName}-table-fixed-left .${appName}-table-body-inner`,
        `.${appName}-table-fixed-right .${appName}-table-body-inner`
      ]
    }
  },

  watch: {
    treeData: {
      immediate: true,
      handler(newVal) {
        if (isType(newVal, 'Array')) {
          this.initOrgListData(newVal)
        } else {
          this.orgListData = []
          console.log('treeData is not Array')
        }
      }
    },
    'headers.dimensions': {
      immediate: true,
      handler(newVal) {
        if (isType(newVal, 'Array')) {
          this.initRowSpan(newVal)
        } else {
          console.error('headers.dimensions is not Array')
        }
      }
    }
  },

  created() {
    this.$nextTick(() => {
      this.initScroll()
    })
  },

  mounted() {
    const appendEl = this.$refs.append
    this.$el.querySelector(`.${this.appName}-table-body`).appendChild(appendEl)
    this.$nextTick(() => {
      this.initItemSize()
    })
  },

  beforeDestroy() {
    if (this.scroller) {
      this.scroller.removeEventListener('scroll', this.onScroll)
      window.removeEventListener('resize', this.onScroll)
    }
  },

  methods: {
    // 初始化表格行尺寸
    initItemSize() {
      this.$nextTick(() => {
        if (!this.listData.length) {
          console.warn('初始化表格行尺寸失败：没有列表数据')
          this.rowSize = this.itemSize || 45
          return
        }
        const className = `${this.appName}-table-row`
        const eles = document.querySelector(`.${className}`)
        this.rowSize = eles ? eles.offsetHeight : this.itemSize || 45
      })
    },
    // 查询后组件rowSpan对象
    initRowSpan(list) {
      list.forEach(item => {
        const { key } = item
        this.rowSpanObj[key] = []
        this.renderRowSpanObj[key] = []
      })
    },
    // 重置表格数据
    initOrgListData(data) {
      if (this.isLoad) {
        // 异步模式下重置第一层
        if (judgeEmptyArr(data)) {
          data.forEach((item, i) => {
            item.id = `${i}`
          })
          this.orgListData = [...data]
          this.listData = [...data]
        } else {
          this.orgListData = []
          this.listData = []
        }
      } else {
        // 同步模式下递归初始化数据
        const reduceInitOrgData = (data, parentId) => {
          if (judgeEmptyArr(data)) {
            data.forEach((item, index) => {
              item.id = parentId ? `${parentId}-${index}` : `${index}`
              if (judgeEmptyArr(item.child)) {
                reduceInitOrgData(item.child, item.id)
              }
            })
          }
        }
        this.orgListData = cloneDeep(data)
        reduceInitOrgData(this.orgListData)
        this.listData = [...data]
      }
    },
    // 节点展开获取到子节点，拼接到orgListData中
    changeOrgListData(data, { record, level }) {
      const id = record.id
      const childData = data.map((item, i) => ({
        ...item,
        id: `${id}-${i}`
      }))
      /**
       * @description 把叶子节点挂载到源数据父节点中
       * @param {array} treeData 源数据
       * @param {string} id 被挂载节点的id
       * @param {number} targetLevel 被挂载节点所处层级
       * @param {number} currentLevel 当前递归层级
       * @param {array} childData 需要挂载的叶子节点数据
       */
      const reduceInsert = (treeData, { targetLevel, currentLevel = 0, id, childData }) => {
        currentLevel += 1
        for (const node of treeData) {
          if (currentLevel == targetLevel && node.id == id) {
            node.child = [...childData]
          } else {
            if (judgeEmptyArr(node.child)) {
              reduceInsert(node.child, { id, targetLevel, currentLevel, childData })
            }
          }
        }
      }
      reduceInsert(this.orgListData, { id, targetLevel: level, currentLevel: 0, childData })
    },
    // 判断是否显示展开的图标
    checkShowOpenIcon(record, i) {
      const rowSpanKey = this.getRowSpanKeyByLevel(i - 1)
      const flag1 = this.headers.dimensions.length > 1
      const flag2 = this.headers.dimensions[i - 1] && record[`${rowSpanKey}Open`] == true
      return i == 0 ? flag1 : i >= this.headers.dimensions.length - 1 ? false : flag1 && flag2
    },
    // 根据层级获取该层级rowSpan数组在rowSpanObj中对应的属性名
    getRowSpanKeyByLevel(level) {
      if (level < 0 || level >= this.headers.dimensions.length) return null
      // console.log({ dimensions: this.headers.dimensions, level })
      return this.headers.dimensions[level].key
    },
    // 点击展开/收起
    async handleOpen(record, { index, key, level }) {
      // console.log({ record, dimensions: this.headers.dimensions }, 'handleOpen====')
      let childRes = []
      if (!record[`${key}Open`]) {
        // 异步模式下，展开时异步获取子项数据
        if (this.isLoad) {
          // openId openLevel openLoading三个标记共同决定该单元格的loading状态
          this.openId = record.id
          this.openLevel = level
          this.openLoading = true
          childRes = await this.onLoad(record, { index, key, currentLevel: level })
          if (!judgeEmptyArr(childRes)) {
            this.openLoading = false
          }
        } else {
          // 同步模式下直接取该项的child
          childRes = judgeEmptyArr(record.child) ? [...record.child] : []
        }
        if (!judgeEmptyArr(childRes)) {
          return message.info('当前节点展开无结果')
        }
        childRes = childRes.map((item, i) => ({
          ...item,
          id: `${record.id}-${i}`
        }))
        this.changeOrgListData(childRes, { record, level })
      }
      // 虚拟滚动状态下，需要加上start才是真正的索引
      this.start && (index += this.start)
      // 先替换数据，后修改状态
      // console.log({ record, start: this.start, index }, '---------')
      // 虚拟滚动收起时点击的数据不对，计算替换一下
      if (record[`${key}Open`]) {
        const rowSpanKey = this.getRowSpanKeyByLevel(level - 1)
        const rowSpanArr = this.rowSpanObj[rowSpanKey]
        for (let i = index; i >= 0; i--) {
          if (rowSpanArr[i] && rowSpanArr[i] > index - i) {
            index = i
            record = this.listData[index]
            break
          }
        }
      }
      this.changeListData(record, { index, key, level, child: [...childRes] })
      // 展开标记反转，操作前先断开这条数据和源数据的强引用关系
      const currentRecord = { ...this.listData[index] }
      this.listData[index] = { ...currentRecord }
      this.listData[index][`${key}Open`] = !record[`${key}Open`]
      this.$forceUpdate()
      // 节点展开前端可能要消耗一段时间，让loading状态覆盖这段时间
      this.openLoading = false
      // console.log(cloneDeep(this.listData), 'listData----')
    },
    // 列表数据变换
    changeListData(record, { index, key, level, child }) {
      const _record = { ...record }
      // 展开节点数据替换
      if (!record[`${key}Open`]) {
        // 展开项会被删除，子项替换展开项之前需要把所有子项中表示祖先项展开的字段设置为true
        const spliceChild = child.map((item, i) => {
          const res = { ...item }
          for (let l = 0; l < level; l++) {
            const openField = `${this.getRowSpanKeyByLevel(l)}Open`
            res[openField] = true
          }
          return res
        })
        // 把子项插入到列表数据中，开始的索引是之前父项的索引
        this.listData.splice(index, 1, ...spliceChild)
        // console.log({ index, spliceChild, listData: cloneDeep(this.listData) }, '插入替换1111')
        this.buildOpenRowSpan(_record, { index, level, mergeCount: spliceChild.length })
      } else {
        // 收起节点数据替换
        // 源数据获取到该项本身，即表格中收起项的父项
        const targetId = _record.id
          .split('-')
          .slice(0, level)
          .join('-')
        const res = getItemById(this.orgListData, { id: targetId })
        // 找到该项在表格中的索引
        const recordIndex = this.listData.findIndex(item => item.id == record.id)
        // 找到该项在表格中占据的行数
        const recordRowSpan = this.rowSpanObj[this.getRowSpanKeyByLevel(level - 1)][recordIndex]
        // 该项本身在表格中替换掉它的子集，替换后把该项数据祖先层的open标识设置为true
        const selfItem = { ...res }
        if (level > 1) {
          for (let i = 0; i < level - 1; i++) {
            const rowSpanKey = this.getRowSpanKeyByLevel(i)
            const openKey = `${rowSpanKey}Open`
            selfItem[openKey] = true
          }
        }
        this.listData.splice(index, recordRowSpan, { ...selfItem })
        // console.log({ selfItem, _record, level, targetId, recordRowSpan }, 'closeRes----')
        this.buildCloseRowSpan({ ...selfItem }, { index, level, mergeCount: recordRowSpan })
      }
      this.handleScroll()
      const { start, end } = this
      this.calcRenderRowSpan({ start, end: end + 1 })
      // console.log({ renderData: this.renderData }, 'renderData-------')
    },
    // 根据祖先节点的id得到这些祖先节点在表格中的索引
    getParentsIndexByIds(ids) {
      const res = []
      if (judgeEmptyArr(ids)) {
        ids.forEach(id => {
          let targetId = id
          let tartIndex = -1
          // 目标项的第一个子项可能被展开，循环拼接'-0'找到目标项
          for (let i = 0; i < this.headers.dimensions.length; i++) {
            tartIndex = this.listData.findIndex(item => item.id == targetId)
            if (tartIndex !== -1) break
            targetId += '-0'
          }
          if (tartIndex !== -1) {
            res.push(tartIndex)
          }
        })
      }
      return res
    },
    /**
     * @description 递归处理同级后置项的子集rowSpan
     * @param list 递归数据，被点击项同级所有后置项
     * @param currentLevel 递归的层级
     * @param targetLevel 被点击项所处层级
     * @param maxLevel 最大层级
     * @param markArr 标记数组，记录同一层级是否被处理过
     * @param index 被展开项在表格中的索引
     * @param wideArr 后代层级要rowSpan数组的扩展集
     * */
    reduceSamelaterItemsChild(list, { currentLevel = 0, targetLevel, maxLevel = 5, markArr, index, wideArr }) {
      currentLevel += 1
      if (currentLevel == maxLevel) return
      list.forEach(item => {
        let id = item.id
        let targetItem = null
        // 考虑被点击项是父项第一个子项情况，逐级拼接'-0'查找展开项
        for (let i = 0; i < this.headers.dimensions.length; i++) {
          targetItem = this.listData.find(l => l.id == id)
          if (targetItem) break
          id = `${id}-0`
        }
        const rowSpanKey = this.getRowSpanKeyByLevel(currentLevel - 1)
        const openKey = `${rowSpanKey}Open`
        const checkOpen = targetItem ? targetItem[openKey] : false
        // 同级不做处理，递归到子集再处理
        if (currentLevel > targetLevel) {
          if (checkOpen) {
            // 同级有多个已展开时，只需要扩展一次rowSpan长度
            if (!markArr[currentLevel]) {
              if (currentLevel == 2) {
                console.log({ rowSpanArr: cloneDeep(this.rowSpanObj[rowSpanKey]), index })
              }
              this.rowSpanObj[rowSpanKey].splice(index, 0, ...wideArr)
              markArr[currentLevel] = 1
            }
            if (judgeEmptyArr(item.child)) {
              this.reduceSamelaterItemsChild(item.child, {
                currentLevel,
                targetLevel,
                maxLevel,
                markArr,
                index,
                wideArr
              })
            }
          }
        } else {
          if (judgeEmptyArr(item.child)) {
            this.reduceSamelaterItemsChild(item.child, { currentLevel, targetLevel, maxLevel, markArr, index, wideArr })
          }
        }
      })
    },
    // 展开时构建合并数据
    buildOpenRowSpan(record, { index, level, mergeCount }) {
      // 获取该节点的所有祖先的id
      const allParentIds = getAllParentIdById(record.id)
      // 渲染在表格中的一般是这些祖先的第一个子项，除非其第一个子项也被展开
      const allParentFirstChildIds = allParentIds.map(id => `${id}-0`)
      // 根据祖先id获取所有祖先当前在表格中的索引
      const allParentIndexList = this.getParentsIndexByIds(allParentFirstChildIds)
      // console.log({ allParentIds, allParentFirstChildIds, allParentIndexList }, 'allParentsId')
      // 对被展开层级的处理，被展开项的第一个子项rowSpan数值增加，增加量为被展开项子集长度
      const rowSpanKey = this.getRowSpanKeyByLevel(level - 1)
      // console.log({ rowSpanObj: this.rowSpanObj, rowSpanKey })
      const currentRowSpan = this.rowSpanObj[rowSpanKey][index]
      if (!currentRowSpan || currentRowSpan == 1) {
        this.rowSpanObj[rowSpanKey][index] = mergeCount
      } else {
        this.rowSpanObj[rowSpanKey][index] += mergeCount
      }
      // 得到每个祖先rowSpan数组的长度扩展量：被展开项子集的长度减一
      const wideArr0 = new Array(mergeCount - 1).fill(0)
      // 被展开项其余子项rowSpan设为0
      this.rowSpanObj[rowSpanKey].splice(index + 1, 0, ...wideArr0)
      // 展开一层时要对该项所有的祖先层的rowSpan做更改
      if (judgeEmptyArr(allParentIndexList)) {
        allParentIndexList.forEach((i, x) => {
          const rowSpanKey = this.getRowSpanKeyByLevel(x)
          // 被展开的祖先rowSpan数值增大
          this.rowSpanObj[rowSpanKey][i] += mergeCount - 1
          // 每个祖先的rowSpan数组扩展长度
          this.rowSpanObj[rowSpanKey].splice(index + 1, 0, ...wideArr0)
        })
      }
      // 如果被展开项后面的同级其他项的子集已展开，这些子集的rowSpan也要变化
      let sameLevelItems = null
      const wideArr1 = new Array(mergeCount - 1).fill(undefined)

      // 其他层通过递归查找到同层级的所有项
      const allSameLevelItems = getSameLevelItems(this.orgListData, { targetLevel: level, currentLevel: 0 })
      // console.log({ level }, 'allSameLevelItems')
      // 截取被点击项后面的项
      if (judgeEmptyArr(allSameLevelItems)) {
        const curIndex = allSameLevelItems.findIndex(item => item.id == record.id)
        sameLevelItems = allSameLevelItems.slice(curIndex + 1)
      }

      // console.log(sameLevelItems, 'sameLevelItems-----')
      if (judgeEmptyArr(sameLevelItems)) {
        this.reduceSamelaterItemsChild(sameLevelItems, {
          currentLevel: level - 1,
          targetLevel: level,
          maxLevel: this.headers.dimensions.length,
          markArr: [],
          index,
          wideArr: wideArr1
        })
      }
      // console.log(cloneDeep(this.rowSpanObj), 'rowSpanObj11111')
    },
    // 收起时构建合并数据
    buildCloseRowSpan(record, { index, level, mergeCount }) {
      // console.log({ ...record }, { index, level }, 'buildCloseRowSpan')
      const rowSpanKey = this.getRowSpanKeyByLevel(level - 1)
      // 获取该节点的所有祖先的id
      const allParentIds = getAllParentIdById(record.id)
      // 渲染在表格中的一般是这些祖先的第一个子项，除非其第一个子项也被展开
      const allParentFirstChildIds = allParentIds.map(id => `${id}-0`)
      // 根据祖先id获取所有祖先当前在表格中的索引
      const allParentIndexList = this.getParentsIndexByIds(allParentFirstChildIds)
      // 对被收起层级的处理
      // 被收起项的rowSpan数值置为1
      if (mergeCount) {
        this.rowSpanObj[rowSpanKey][index] = 1
      }
      // 被收起项层级rowSpan数组缩减currentRowSpan - 1长度
      this.rowSpanObj[rowSpanKey].splice(index + 1, mergeCount - 1)
      // 被收起项的所有后代层rowSpan数组长度也要缩减
      for (let i = level; i < this.headers.dimensions.length; i++) {
        const rowSpanKey = this.getRowSpanKeyByLevel(i)
        const rowSpanNum = this.rowSpanObj[rowSpanKey][index]
        if (typeof rowSpanNum == 'number') {
          this.rowSpanObj[rowSpanKey][index] = undefined
        }
        this.rowSpanObj[rowSpanKey].splice(index + 1, mergeCount - 1)
      }
      // 收起一项时要对该项所有的祖先层的rowSpan做更改
      if (judgeEmptyArr(allParentIndexList)) {
        allParentIndexList.forEach((i, x) => {
          const rowSpanKey = this.getRowSpanKeyByLevel(x)
          // 被展开的祖先rowSpan数值减小
          this.rowSpanObj[rowSpanKey][i] -= mergeCount - 1
          // 每个祖先的rowSpan数组缩减长度
          this.rowSpanObj[rowSpanKey].splice(index + 1, mergeCount - 1)
        })
      }
      // console.log(cloneDeep(this.rowSpanObj), 'rowSpanObj22222')
    },
    // 初始化虚拟滚动所需参数
    initScroll() {
      this.isInnerScroll = false
      this.scroller = this.getScroller()
      this.setToTop()
      // 首次需要执行2次handleScroll：因为第一次计算renderData时表格高度未确认导致计算不准确；第二次执行时，表格高度确认后，计算renderData是准确的
      this.handleScroll()
      this.$nextTick(() => {
        this.handleScroll()
      })
      // 监听事件
      this.onScroll = throttle(this.handleScroll, this.throttleTime)
      this.scroller.addEventListener('scroll', this.onScroll)
      window.addEventListener('resize', this.onScroll)
    },
    // 获取滚动元素
    getScroller() {
      return this.$el.querySelector(`.${this.appName}-table-body`)
    },
    // 设置表格到滚动容器的距离
    setToTop() {
      if (this.isInnerScroll) {
        this.toTop = 0
      } else {
        // getBoundingClientRect获取元素大小及其相对视口位置
        this.toTop =
          this.$el.getBoundingClientRect().top -
          (this.scroller === window ? 0 : this.scroller.getBoundingClientRect().top) +
          getScrollTop(this.scroller)
      }
    },
    // 表格垂直滚动
    handleScroll() {
      if (this.listData.length < this.virtualSize) return
      // 计算renderData
      this.calcRenderData()
      // 计算rowSpan
      this.calcRenderRowSpan({ start: this.start })
      // 计算位置
      this.calcPosition()
    },
    // 更新尺寸（高度）
    updateSizes() {
      const appName = this.appName
      const rows = this.$el.querySelectorAll(`.${appName}-table-body .${appName}-table-tbody .${appName}-table-row`)
      Array.from(rows).forEach((row, index) => {
        const item = this.renderData[index]
        if (!item) return
        const offsetHeight = row.offsetHeight
        const key = item[this.keyProp]
        if (this.sizes[key] !== offsetHeight) {
          this.$set(this.sizes, key, offsetHeight)
        }
      })
    },
    // 计算位置
    calcPosition() {
      const last = this.listData.length - 1
      // 计算内容总高度
      const wrapHeight = this.getItemOffsetTop(last) + this.rowSize
      // 计算当前滚动位置需要撑起的高度
      const offsetTop = this.getItemOffsetTop(this.eventStart)
      // console.log(this.eventStart, offsetTop, 'offsetTop-------')
      this.TableBodyClassNames.forEach(className => {
        const el = this.$el.querySelector(className)
        if (!el) return
        if (!el.wrapEl) {
          const wrapEl = document.createElement('div')
          const innerEl = document.createElement('div')
          // 此处设置display为'inline-block'，是让div宽度等于表格的宽度，修复x轴滚动时右边固定列没有阴影的bug
          wrapEl.style.display = 'inline-block'
          wrapEl.style.width = '100%'
          innerEl.style.display = 'inline-block'
          innerEl.style.width = '100%'
          innerEl.id = 'innerEl'
          wrapEl.appendChild(innerEl)
          innerEl.appendChild(el.children[0])
          el.insertBefore(wrapEl, el.firstChild)
          el.wrapEl = wrapEl
          el.innerEl = innerEl
        }
        if (el.wrapEl) {
          // 设置高度
          el.wrapEl.style.height = wrapHeight + 'px'
          // 设置transform撑起高度
          el.innerEl.style.transform = `translateY(${offsetTop}px)`
        }
      })
    },
    // 获取某条数据offsetTop
    getItemOffsetTop(index) {
      return this.rowSize * index
    },
    // 执行update方法更新虚拟滚动，且每次nextTick只能执行一次【在数据大于100条开启虚拟滚动时，由于监听了data、virtualized会连续触发两次update方法：第一次update时，（updateSize）计算尺寸里的渲染数据（renderData）与表格行的dom是一一对应，之后会改变渲染数据（renderData）的值；而第二次执行update时，renderData改变了，而表格行dom未改变，导致renderData与dom不一一对应，从而位置计算错误，最终渲染的数据对应不上。因此使用每次nextTick只能执行一次来避免bug发生】
    doUpdate() {
      if (this.hasDoUpdate) return // nextTick内已经执行过一次就不执行
      if (!this.scroller) return // scroller不存在说明未初始化完成，不执行

      // 启动虚拟滚动的瞬间，需要暂时隐藏el-table__append-wrapper里的内容，不然会导致滚动位置一直到append的内容处
      this.isHideAppend = true
      this.setToTop()
      this.handleScroll()
      this.hasDoUpdate = true
      this.$nextTick(() => {
        this.hasDoUpdate = false
        this.isHideAppend = false
      })
    },
    // 计算只在视图上渲染的数据
    calcRenderData() {
      const { scroller, buffer, listData: data } = this
      // 计算可视范围顶部、底部
      const top = getScrollTop(scroller) - buffer * this.rowSize - this.toTop
      const scrollerHeight = this.isInnerScroll ? this.$attrs.scroll.y : getOffsetHeight(scroller)
      const bottom = getScrollTop(scroller) + scrollerHeight + buffer * this.rowSize - this.toTop
      let start
      let end
      if (!this.dynamic) {
        start = top <= 0 ? 0 : Math.floor(top / this.rowSize)
        end = bottom <= 0 ? 0 : Math.ceil(bottom / this.rowSize)
      } else {
        // 二分法计算可视范围内的开始的第一个内容
        let l = 0
        let r = data.length - 1
        let mid = 0
        while (l <= r) {
          mid = Math.floor((l + r) / 2)
          const midVal = this.getItemOffsetTop(mid)
          if (midVal < top) {
            const midNextVal = this.getItemOffsetTop(mid + 1)
            if (midNextVal > top) break
            l = mid + 1
          } else {
            r = mid - 1
          }
        }
        // 计算渲染内容的开始、结束索引
        start = mid
        end = data.length - 1
        for (let i = start + 1; i < data.length; i++) {
          const offsetTop = this.getItemOffsetTop(i)
          if (offsetTop >= bottom) {
            end = i
            break
          }
        }
      }
      // 开始索引始终保持偶数，如果为奇数，则加1使其保持偶数【确保表格行的偶数数一致，不会导致斑马纹乱序显示】
      const isUnEvenStart = start % 2
      const eventStart = isUnEvenStart ? start - 1 : start
      // if (start !== this.start) {
      //   // 缓存上次表格起始索引，用作计算两次滚动间滚动的行数
      //   this.oldStart = this.start
      //   this.calcRenderRowSpan({ start })
      // }
      this.top = top
      this.bottom = bottom
      this.start = start
      this.eventStart = eventStart
      this.end = end
      this.renderData = data.slice(start, end + buffer)
      // console.log(cloneDeep(this.renderRowSpanObj), 'renderRowSpanObj')
      // console.log(data, 'listData')
      // console.log(cloneDeep(this.renderData), 'renderData')
    },
    // 计算渲染数据使用的rowSpan
    calcRenderRowSpan({ start }) {
      const { rowSpanObj } = this
      Object.keys(rowSpanObj).forEach(key => {
        const arr = [...rowSpanObj[key]]
        const rowSpanArr = rowSpanObj[key].slice(start)
        if (!rowSpanArr.length) {
          this.$set(this.renderRowSpanObj, key, rowSpanArr)
          return
        }
        for (let i = start; i >= 0; i--) {
          const rowSpan = arr[i]
          if (rowSpan) {
            // 合并单元格第一行刚好在表格第一行的情况
            if (i === start) {
              rowSpanArr[0] = rowSpan
              break
            }
            const scrollDiff = Math.abs(start - i)
            // 合并单元格部分在可视域外部分在可视域内的情况
            if (rowSpan > scrollDiff) {
              rowSpanArr[0] = Math.abs(rowSpan - scrollDiff)
            }
            break
          }
        }
        this.$set(this.renderRowSpanObj, key, rowSpanArr)
      })
    }
  }
}
</script>

<style lang="less" scoped>
.flex-box,
.flex-box-align-center,
.flex-box-justify-center {
  display: flex;
}

.flex-box-align-center {
  align-items: center;
}

.AnalysisTable-container {
  width: 100%;
  // height: calc(100% - 140px);
  height: 100%;
  position: relative;

  .result-table {
    height: 100%;
    width: 100%;
    min-height: 136px;
  }

  /deep/.@{APP_NAME}-spin-nested-loading {
    height: 100%;
    .@{APP_NAME}-spin-container {
      height: 100%;
      .@{APP_NAME}-table {
        height: calc(100%);
        .@{APP_NAME}-table-content {
          height: 100%;
          .@{APP_NAME}-table-scroll {
            height: 100%;
            overflow: hidden;
            .@{APP_NAME}-table-body {
              position: relative;
              min-height: calc(100% - 44px) !important;
              overflow-y: scroll !important;

              tr {
                height: 44px !important;

                td {
                  height: 43px !important;
                }
              }

              tr:last-child td {
                border-bottom: 1px solid #e9ebee;
              }
            }
          }
        }
      }
    }
  }

  // 为了去除无数据时，顶部有多余的线
  /deep/.@{APP_NAME}-table-placeholder {
    border-top: 0;
  }

  /deep/.@{APP_NAME}-table-hide-scrollbar {
    width: calc(100% + 11px) !important;
    padding-right: 8px;
  }

  /deep/.@{APP_NAME}-table-wrapper {
    height: 100%;
  }
  // 下面两组css是为了横向滚动时的固定列能正常展示
  /deep/.@{APP_NAME}-table-fixed {
    &-left,
    &-right {
      height: 100%;
    }
  }
  /deep/.@{APP_NAME}-table-body-outer {
    height: 100%;
    /deep/.@{APP_NAME}-table-body-inner {
      min-height: calc(100% - 44px) !important;
      overflow-y: auto !important;
    }
  }

  .opt-box {
    user-select: none;
  }

  .opt-icon {
    user-select: none;
    cursor: pointer;
  }

  .table-span {
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.spin-loaing {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%);
  z-index: 9;
}
</style>


