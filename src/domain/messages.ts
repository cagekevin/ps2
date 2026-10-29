/**
 * 【唯一入口】【范本】面向用户的**全部界面文字**（失败提示 + 标签 / 标题 / 菜单 / 空态 / 进度）
 * —— 全仓只许这一处；`commands` / `domain` / `repo` / `features` 一律 import 这里。
 *
 * 替代了什么：以前每个 `fail(...)` 就地写中文（动作页 33 处 / 常用页 14 处），
 * 同一个概念在不同文件里长出不同说法（「文件无法识别」与「XX 项不是对象」并存），
 * 下一次写码的人不知道抄哪一句。
 *
 * 谁在用：`domain/*`、`repo/*`、`commands/*`。**`core/` 不能用**——`core` 不许 import `domain`，
 * 那里 27 处 `lenientVoid('…失败')` 文案仍是独立来源（已记债，收法是把 label 换成码）。
 *
 * 存量边界（不追溯，但别照抄）：
 *   - 常用页 / 动作页 **已全部迁到本表**（`grep 中文 fail*` 在这两条链路 = 0）；
 *   - `font` / `style` / `ku` 等页面仍有约 **99 处**就地写中文 → `TD-09-6`（逐页迁）；
 *   - `core/ps` 的 **29 处** `lenientVoid` / `strictVoid` 文案 → `TD-04-1`（`core` 不能 import `domain`，
 *     收法是把 label 换成码、由 `commands` 给文案）。
 *   **看到存量不要照着写**：新写与正在改的一律用本表。
 *
 * **唯一例外**：传给 jsx 的**参数值**（如翻转方向 `'左右'` / `'上下'`）不是界面文字，
 * 必须与官方字符串逐字一致，留在调用点或数据表里，**不要**挪进来。
 *
 * 分层：顶层键 = 跨页通用句（`corrupt` / `badPayload` / `stale` / `badArgument` / `freePanelOffline`）；
 * `common` = 常用页（失败 + 全部界面文字）；`action` = 动作页（同上）。
 *
 * 禁止：
 *   1. 在 `fail` / `failWithDetail` 里**再写中文**（`grep -rnE "fail\([^)]*[一-龥]" src` 应为 0，`core/` 除外）；
 *   2. 为**每个字段**各造一句（「XX 项缺少 YY」这类）——统一用 `corrupt`，现场（字段路径 / 下标）进 `detail`；
 *   3. 把 log 用的技术描述写进来——这里是**用户能看到的**话，技术现场归 `detail`。
 *
 * 判据：一段中文的读者是谁？用户 ⇒ 必须来自本表；写代码的人 ⇒ 断言（`throw`），不要放这里。
 */

export const MSG = {
  /**
   * 文件结构认不出（索引 / 仓库 / `.dzx` / 常用项数组）。
   *
   * 只此一句，不分域、不分字段：用户看「文件无法识别」，排障看 `detail: root[2].list[1].group`。
   */
  corrupt: '文件无法识别',

  /**
   * 宿主（PS）返回的东西认不出：与 `corrupt` 分开——那个是**文件**坏了，这个是**通道**给错了，
   * 用户能做的事不同（前者去修文件，后者重试 / 检查 PS 状态）。
   */
  badPayload: '返回数据无法识别',

  /** 数据在操作之间变了（下标过期、项已被删、库被外部改动）：一句通用，细节进 `detail` */
  stale: '数据已变化，请刷新后重试',

  /**
   * 调用方传了不认识的**设置路径**（写 `sj_set.json` 前的那层白名单）。
   *
   * 与 `corrupt` 分开：那不是文件坏，是**我们自己拼错了键**（开发者错误）；
   * 用户永远看不到（所有面板路径都在白名单内），但日志要能一眼区分「数据坏」与「参数错」。
   */
  badArgument: '设置项不合法',

  /** 跨页共用：Ctrl+点击 / Ctrl+右键 进自由面板（未实现，`TD-09-7`）时的统一提示 */
  freePanelOffline: '自由面板未上线',

  /** 动作页的全部界面文字（标题 / 按钮 / 菜单 / 空态 / 确认 / 成功提示） */
  action: {
    /* 官方逐字：三个输入框的空值提示 */
    needGroupName: '请输入组名',
    needNewGroupName: '请输入新组名',
    /** 别名弹窗标题（同一个话说给另一个入口听；空串提交 = 删别名，见 `05` §3.10 F1） */
    aliasTitle: '请输入别名',
    /** 官方逐字：删到只剩一个仓库 */
    keepOneWarehouse: '最少保留一个分组哦',
    /** 官方逐字：带星号，与页面空态那句不是同一件事 */
    emptyGroup: '*该分组没有动作',

    /* 页面与控件 */
    pageTitle: '动作管理页',
    addAction: '添加动作',
    selectAll: '全选',
    emptyGrid: '该动作组空空如也',
    addGroup: '添加分组',
    displayMode: '显示方式',
    importPreset: '导入预设',
    exportPreset: '导出预设',
    defaultGroupName: '未命名分组',
    renameWarehouse: '重命名当前仓库',
    newWarehouse: '新建仓库',
    columnOne: '单列',
    columnTwo: '双列',
    columnThree: '三列',

    /* 右键菜单 */
    menuNewGroup: '新建分组',
    menuRename: '重命名',
    menuDelete: '删除',
    menuEditAlias: '修改别名',
    menuAddAlias: '添加别名',
    menuDeleteAlias: '删除别名',
    menuExportAll: '导出所有仓库',
    menuExportCurrent: '导出当前仓库',
    menuImport: '导入动作仓库',
    menuAppend: '追加动作仓库',
    menuAppendPreset: '追加插件自带预设',

    /* 成功提示 */
    doneDelete: '删除成功',
    doneCreate: '创建成功',
    doneRename: '修改成功',
    doneExport: '导出成功',
    doneImport: '导入成功',
    doneAppend: '追加成功',

    /* 确认与进度 */
    importTitle: '导入提示',
    importReplaceAsk: '将替换动作库索引，是否继续？',
    importContinue: '继续',
    readingActions: '正在读取 PS 动作...',
    defaultFileName: '设计助理所有预设.dzx',
    guideTitle: '欢迎首次使用',
    guideAsk: '是否导入自带动作预设？含有修图 / 新建文档等功能',
    guideImport: '导入'
  },

  /** 页面固定句：坏项计数（前缀，后面接「（悬停看位置）」） */
  droppedSummary: '项无法识别，已跳过（悬停看位置）',
  /** 页面固定句：网格空态（官方 0 命中，属我们自己的空态句式） */
  emptyCommonGrid: '没有可显示的常用功能',

  /** 常用页 */
  common: {
    /** 自造-输入校验（官方搜 0）。**当前不可达**：缩放区只有预设档位；随 `TD-09-8`（补输入框）变可达 */
    needZoom: '请输入有效的缩放倍数',
    needGap: '请输入间距',
    /** 官方逐字（`$tips.show("请输入宽度")`，`:1258609`） */
    needWidth: '请输入宽度',
    /** 官方逐字：`$msg.show("自定义目录不存在，请检查设置")` */
    badExportPath: '自定义目录不存在，请检查设置',
    /** 官方逐字：扫目录结果为空 */
    noPsd: '文件夹内没有PSD文件',
    /** 官方逐字（`$msg.showErr`，`:1232790`）：面板「复制数量」为空 */
    needCopyCountInput: '请输入要复制的数量',
    /** 官方逐字（`$msg.showErr`，`:1233599`）：命令层 `number < 1` */
    countMin: '要复制的个数不能小于1',
    /** 官方逐字（`$tips.show`，`:1254108` / `:1255060`） */
    cancel: '取消操作',
    cancelPick: '取消选择',
    /** 官方逐字（`$tips.show`，`:1248817`） */
    qualityRange: '品质只能设置成1-100',
    /** 官方逐字（`$msg.showErr`，`:1233355` / `:1233472` / `:1233715`） */
    ratioMin: '输入的比例不能小于等于0',
    ratioMax: '输入的比例不能大于9999比例不能小于0或等于0',
    opacityMax: '透明度不能大于99',
    /** 官方逐字的**控件 title**（`:1236511` 一带品质框、`:1246340` 保存到、`:1229875` 图层名、`:1245235` 另存为单选） */
    qualityTitle: '品质1-100',
    pickFolderTitle: '选择自定义目录',
    layerNameTitle: '使用当前图层名字',
    saveAsTitle: '与ctrl+shift+s保存一样',
    /** 官方逐字：参考线「生成」按钮 title（`:1258609` 一带的 `useGuide` 按钮） */
    safeAreaTitle: '在文档中间安全区域生成2条参考线',

    /** 官方逐字：转智能对象的两句进度（`:1219201` / `:1218508`） */
    progressLinkSmart: '正在转链接智能对象...',
    progressLinkBack: '正在转回普通智能对象...',
    /** 官方逐字：自定义变换 > 5 个时的处理提示（`:1234539`） */
    progressProcessing: '正在处理...',
    /** 官方逐字：批量导出一级 / 二级图层的进度（`:1277979` / `:1279053`） */
    progressExportFirst: '正在导出一级图层...',
    progressExportSecond: '正在导出二级图层...',
    /** 官方逐字：扫目录前的提醒（`:1250698` 一带） */
    tipRootFolder: '不要乱选根目录，不然加载时间会很久哦',
    /** 官方逐字：批量导出 >30 的确认对话框（`$msg.confirm`，`:658805` / `:1252874`） */
    confirmTitle: '提示',
    confirmBatch: '文件夹内超过30个psd，导出时间较长是否继续？',
    confirmContinue: '继续',


    /** 官方逐字：`$load.show` 的进度/遮罩句（`:1222303` 一带、`:1232059`…），带官方省略号 */
    progressEmbedMulti: '正在嵌入多图层...',
    progressImportMulti: '正在嵌入多图片...',
    progressExport: '正在导出图片...',
    pickImage: '请选择图片',
    /** 官方逐字（`:1281465` / `:1281476`）：自动填充颜色的两句开关反馈 */
    fillOn: '开启智能填色',
    fillOff: '已关闭',

    /* ---- 常用页界面文字（与失败文案同表：用户可见文字只有这一处） ---- */
    pageTitle: '常用功能页',
    zoomEnlarge: '放大',
    zoomShrink: '缩小',
    anchorPosition: '锚点位置',

    /* 嵌入面板 */
    linkNone: '嵌入时不存链接对象',
    linkRaw: '嵌入时存链接对象(图片原始路径)',
    linkSameDir: '嵌入时存链接对象(与PSD同一目录)',
    autoEmbedDrop: '拖入图片自动嵌入图片',
    autoEmbedPaste: '粘贴图片自动嵌入图片',
    autoEmbedClip: '使用剪贴蒙版时自动嵌入图片',
    deleteNextLayer: '删除下一图层',
    relinkOnDrop: '拖入图片转成链接智能对象',

    /* 导入面板 */
    toLinkObject: '转成链接智能对象',

    /* 优化面板 */
    optimizeAll: '优化所有智能对象图层',
    deleteEmpty: '删除所有空图层',
    deleteHidden: '删除所有隐藏图层',
    batchOptimize: '批量优化文档',

    /* 参考线面板 */
    guideOn: '开启智能参考线(使用后请关闭)',
    guideOnTip: '开启后，点击即可生成参考线',
    guideWidth: '参考线宽度',

    /* 间距面板 */
    spacing: '间距',
    distributeH: '按间距水平分布',
    distributeV: '按间距垂直分布',
    sortByLayer: '按图层排序',
    sortByCoord: '按坐标排序',

    /* 自定义变换面板 */
    fieldCount: '复制数量',
    fieldScale: '缩放比例',
    fieldLeftRight: '左右距离',
    fieldTopBottom: '上下距离',
    fieldAngle: '旋转角度',
    fieldOpacity: '透明度递减',

    /* 翻转 6 向的悬停文案（`direction` 是传给 jsx 的参数值，**不进本表**） */
    flipTitleLr: '左右翻转',
    flipTitleTb: '上下翻转',
    flipTitleLeft: '向左翻转',
    flipTitleRight: '向右翻转',
    flipTitleBottom: '向下翻转',
    flipTitleTop: '向上翻转',

    /* 导出面板（标签 / 标题 / 单选文案；全部官方逐字，M 组已核） */
    exFormat: '导出格式',
    exPngDepth: 'PNG 位深',
    exSaveTo: '保存到',
    exPickFolder: '选择目录',
    exDesktop: '桌面',
    exSaveToDesktop: '保存到桌面',
    exFileDir: '文件所在目录',
    exSaveToFileDir: '保存到文件所在目录',
    exNaming: '命名',
    exLayerName: '图层名',
    exAutoNumber: '自动编号',
    exAutoNumberTip: '不覆盖原图，使用数字编号命名。不支持多个切片哦',
    exWebMode: '使用导出Web方式(可以切片)',
    exSaveAsMode: '使用另存为方式(不压缩)',
    exCompress: '压缩尺寸 & 加水印',
    exWidth: '导出宽度',
    exHeight: '导出高度',
    exWatermark: '水印文件',
    exPickWatermark: '选择水印文件',
    exExportOriginal: '同时导出原图',
    exFolderPanel: '所在目录设置',
    exOpenFolderAfter: '保存后自动打开所在目录',
    exBatchPanel: '批量导出功能',

  },

} as const;
