/**
 * 【唯一入口】【范本】面向用户的**全部界面文字**（失败提示 + 标签 / 标题 / 菜单 / 空态 / 进度）
 * —— 全仓只许这一处；`commands` / `domain` / `repo` / `features` 一律 import 这里。
 *
 * 替代了什么：以前每个 `fail(...)` 就地写中文（动作页 33 处 / 常用页 14 处），
 * 同一个概念在不同文件里长出不同说法（「文件无法识别」与「XX 项不是对象」并存），
 * 下一次写码的人不知道抄哪一句。
 *
 * **谁在用**：`core/*`、`domain/*`、`repo/*`、`commands/*`、`features/*` —— 全仓所有层。
 * 本表放在 `types/` 正是为了让 **`core` 也能 import**（`core` 不许 import `domain`，而 `types` 是最底层）。
 *
 * 现状（2026-10-29 收口完成，可复算）：
 *   `grep -rnE "fail(WithDetail)?\('[A-Z_]+', *'[^']*[一-龥]" src` 在**生产代码 = 0 处**（只剩注释里的历史说明）；
 *   `grep -rnE "toast\.(error|info)\('[^']*[一-龥]" src` = 0 处。
 *
 * **唯一例外（不是文案，别搬进来）**：
 *   1. 传给 jsx 的**参数值**（翻转方向 `'左右'`/`'上下'`、`fn: 'cy_xxx'`）；
 *   2. **官方数据表**（语言下拉 `自动检测/中文/…`、`font-panel-constants` 的官方按钮名）；
 *   3. PS 历史记录名 `CapabilitySpec.label`（`批量导出一级图片` 等，按官方逐字传给 PS）。
 *   这三类改的是「数据/协议」，不是「界面话术」；搬进来会把数据表变成文案表。
 *
 * 分层：顶层 = 跨页通用（`corrupt` / `badPayload` / `stale` / `badArgument` / `freePanelOffline` / `droppedSummary`…）；
 * `codeReason` = 错误码 → 话（生产者自己取，消费者不查表补字）；
 * `common` / `action` / `style` / `font` / `home` / `coreOps` = 分域。
 *
 * 禁止：
 *   1. 在 `fail` / `failWithDetail` / `toast.*` 里**再写中文**；
 *   2. 为**每个字段**各造一句（「XX 项缺少 YY」）——统一用 `corrupt`，现场（字段路径 / 下标）进 `detail`；
 *   3. 消费者替生产者改口径：`StateHint` / `run` 只展示 `result.reason`，**不查表补字、不加前缀**；
 *   4. 把 log 用的技术描述写进来——这里是**用户能看到的**话。
 *
 * 判据：一段中文的读者是谁？用户 ⇒ 必须来自本表；写代码的人 ⇒ 断言（`throw`），不要放这里。
 */

import type { ErrorCode } from './result';

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
    exBatchPanel: '批量导出功能'
  },

  /**
   * **错误码 → 用户话**的唯一映射：`core` 只产码（不产中文），消费方（`StateHint` / `useRunCommand`）
   * 在 `reason` 为空时用这里兜。
   *
   * 为什么需要它：`core` 不许 import `domain`（分层），所以 core 的失败臂只能带 `code` + 技术 `detail`；
   * 若让每个调用点自己拼中文，就又长出第二套写法。
   */
  /** 样式页（`features/style`）的界面文字：按钮 title、右键菜单、成功提示、确认正文 */
  style: {
    addColor: '添加当前前景色',
    addGradient: '添加渐变色，仅支持形状图层',
    addFont: '添加字体，支持多图层',
    addStyle: '添加样式',

    noWarehouse: '没有选中仓库',
    gradientNoData: '这个渐变项缺少数据',

    doneAdded: '已添加',
    doneAddedForeground: '已添加当前前景色',
    doneGroupCreated: '已新建分组',
    doneDelete: '已删除',
    doneRename: '已重命名',
    doneReorder: '已调整顺序',
    doneReorderGroup: '已调整分组顺序',
    doneImport: '导入完成',
    doneExportAll: '已导出所有仓库',
    doneExportCurrent: '已导出当前仓库',
    doneToSwatch: '已发送到色板',
    doneAppendSwatch: '已追加到色板',
    donePickToGroup: '已吸取颜色到组',

    menuNewGroup: '创建新组',
    menuToSwatch: '发送到色板',
    menuAppendToSwatch: '追加到色板',
    menuPickToGroup: '快速吸色到组',
    menuToWarehouse: '发送到仓库…',
    menuMoveWarehouse: '移动到仓库…',

    /* 吸色 / 解析图片 */
    dropOneImage: '请拖入1张图片',
    parseImageFailed: '解析图片失败',

    confirmDeleteMessage:
      '会直接改写库文件，原文件已备份为同目录下的 .bak（回滚：把 .bak 复制回同名文件）',

    /* repo 层：文件名（进 `${label}不是合法 JSON`）、索引缺登记的提示、新建分组默认名 */
    fileIndex: '仓库索引',
    fileLibrary: '库文件',
    noLibraryFile: '索引里没有登记这个库的文件名',
    untitledGroup: '未命名分组',
    /** 库条目内层 JSON 的标签（进 `${label}不是合法 JSON`） */
    kuItemInner: '库条目内层',
    /** 色板文件 */
    fileSwatch: '色板文件',

    /* 命令层：默认名、新建组名、吸色结果、文件对话框标题 */
    untitledName: '未命名',
    groupFromColors: '提取颜色组',
    groupFromGradients: '提取渐变组',
    pickTimeout: '吸色超时（60 秒内没有取色）',
    dialogImport: '导入样式仓库',
    dialogAppend: '追加样式仓库',
    dialogExportAll: '导出所有仓库',
    dialogExportCurrent: '导出当前仓库'
  },

  /** 诊断页（`features/home`）：页头、分区标题、确认句、成功提示 */
  home: {
    diagButton: '诊断官方能力',
    logButton: '查看日志',
    sectionJsx: '官方 jsx 函数',
    sectionConfig: '官方配置依赖',
    sectionLog: '日志（%TEMP%\\maomao.log）',
    copyDiag: '诊断结果',
    copyLog: '日志',
    reachable: '接口可达',
    emptyLog: '（日志为空）',
    cleared: '日志已清空',
    clearTitle: '清空日志？',
    clearMessage: '清空后无法恢复。',
    clearConfirm: '清空',
    nothingToCopy: '没有可复制的内容'
  },

  /** 字体域（`commands/font-set`、字体面板、字体管理页）的失败与提示 */
  font: {
    /* 输入校验：用户填错了，给具体规则 */
    needButtonPadding: '请填写按钮内边距',
    needPresetName: '请输入预设名字',
    fontSizePositive: '字号必须是大于 0 的数字',
    leadingNotNegative: '行距不能是负数',
    trackingNumber: '字距必须是数字',
    hierarchySizePositive: '层级字号必须是大于 0 的数字',

    /* 业务前提 */
    copyStyleFirst: '请先复制字体样式',
    noTextToTranslate: '没有可翻译的文本',
    translateLimit: '今天的翻译次数已用完，请明天再试',
    missingPostScript: '缺少 PostScript 名，无法换字体',
    keepOnePreset: '至少要保留一个层级预设',
    keepOneQuickFont: '至少要保留一个快捷字体',
    starRange: '评分只能是 1、2、3',
    tagNameEmpty: '标签名不能为空',
    tagsExported: '已导出标签',

    noPresetToOverwrite: '当前没有可覆盖的层级预设',
    fontNotInSystem: '系统字体里找不到该字体，无法加入快捷字体',

    /* 文件名（进 JSON 解析失败的句子里：`${label}不是合法 JSON`） */
    fileSettings: '字体面板设置',
    fileQuickFonts: '快捷字体',
    fileHierarchy: '层级预设',
    fileTranslateCounter: '翻译计数',
    fileRecentFonts: '最近字体',
    /** 层级预设里自动补的那条名字（用户可见） */
    defaultPreset: '默认',
    /** 标签/评分导入文件的文件名（进 `${label}不是合法 JSON`） */
    fileTagsImport: '标签导入文件'
  },

  /**
   * `core/ps` 里**每个能力各自的**失败话术（能力表 `parse` 的 fallback）。
   *
   * 为什么要单独一组：这些不是"某个码的通用话"，而是"这个操作为什么不支持"，
   * 换句泛化话术会丢掉「不支持改字号 / 不支持缩放」的区分。它们仍在**同一张表**里。
   */
  coreOps: {
    textNoAttrs: '当前图层没有可读的文字属性',
    fontUnavailable: '字体不可用',
    fontSize: '当前图层不支持改字号',
    leading: '当前图层不支持改行距',
    tracking: '当前图层不支持改字距',
    letterCase: '当前图层不支持切换大小写',
    visual: '当前图层不支持视觉调整',
    skew: '当前图层不支持倾斜',
    bold: '当前图层不支持加粗',
    paraAlign: '当前图层不支持段落对齐',
    textAlign: '当前图层不支持文本对齐',
    hCenterDistribute: '当前图层不支持水平居中分布',
    vAvgDistribute: '当前图层不支持垂直平均分布',
    vAlign: '当前图层不支持垂直对齐',
    bgAlign: '当前图层不支持与背景对齐',
    centerAlign: '当前图层不支持居中对齐',
    spacingDistribute: '当前图层不支持按间距分布',
    splitMerge: '当前图层不支持拆分或合并',
    createButton: '当前图层无法生成按钮',
    textDirection: '当前图层不支持切换文本方向',
    writeBack: '当前图层不支持写回译文',
    scale: '当前图层不支持缩放',
    clearGuide: '清除参考线失败',
    sliceByGuide: '按参考线切片失败',
    openFolder: '打开所在目录失败',
    relink: '转链接智能对象失败',
    optimizeDoc: '优化文档失败'
  },

  codeReason: {
    IO_ERROR: '文件读写失败',
    NOT_FOUND: '文件不存在',
    CORRUPT: '文件无法识别',
    VALIDATION: '参数不合法',
    PS_NO_DOC: '没有打开的文档',
    PS_WRONG_LAYER: '当前图层不是形状图层',
    PS_SKIPPED: '自动填充已关闭，请先在 PS 里打开',
    PS_REJECTED: 'PS 拒绝执行，请确认已选中图层',
    PS_UNREADY: 'PS 还没准备好，请稍后重试',
    PS_ERROR: 'PS 执行失败',
    NETWORK: '网络请求失败',
    TIMEOUT: '等待超时',
    AUTH: '没有权限，请重新登录',
    FORBIDDEN: '当前操作不被允许',
    CANCELLED: '已取消',
    UNKNOWN: '未知错误'
  } as Record<ErrorCode, string>

} as const;
