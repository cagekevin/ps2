/**
 * 【范本】**消息表**：只收「一条完整的、给用户看的话」——失败提示、toast、确认框、成功提示、
 * 进度、空态句、输入校验。**不收界面文字**（按钮 label、字段 title、placeholder、选项名、
 * 数据文件名、枚举值）——那些就近写在组件或调用点。
 *
 * 为什么要有这张表：这些消息**跨层产生**（`core` / `domain` / `repo` / `commands` 都可能失败，
 * 由 UI 显示），散在各层写中文就会同一个概念长出好几种说法（「文件无法识别」与「XX 项不是对象」并存）。
 * 表放在 `types/`，是因为 `core` 不许 import `domain`，而 `types` 是最底层、所有层都能 import。
 *
 * **判据（一条）**：这句话是「系统告诉用户发生了什么」吗？
 *   - 是（失败 / 确认 / 成功 / 进度 / 空态 / 校验）⇒ 进本表；
 *   - 不是（按钮叫「保存到」、字段叫「图层名」、文件叫「常用页设置」）⇒ 留在原处。
 *
 * **不许进本表**：
 *   1. 界面文字：label / title / placeholder / 菜单项 / 单选与下拉选项；
 *   2. 名字：文件名、默认分组名、未命名、提取颜色组；
 *   3. 协议值：`fn: 'cy_xxx'`、翻转方向 `'左右'`、PS 历史名 `CapabilitySpec.label`；
 *   4. 官方数据表：语言下拉、`font-panel-constants` 的按钮名。
 *   （2026-10-31 起全仓已无遗留：最后一批在 `MSG.home`，已退回该页。）
 *
 * 分层：顶层 = 跨页通用（`corrupt` / `badPayload` / `stale` / `badArgument` / `freePanelOffline` / `droppedSummary`…）；
 * `codeReason` = 错误码 → 话（**生产者**自己取，消费者不查表补字）；
 * `common` / `action` / `style` / `font` / `home` / `coreOps` = 分域。
 *
 * 禁止：
 *   1. 在 `fail` / `failWithDetail` / `toast.*` 里**再写中文**；
 *   2. 为**每个字段**各造一句（「XX 项缺少 YY」）——统一用 `corrupt`，现场（字段路径 / 下标）进 `detail`；
 *   3. 消费者替生产者改口径：`StateHint` / `run` 只展示 `result.reason`，**不查表补字、不加前缀**；
 *   4. 把 log 用的技术描述写进来——这里只放**用户能看到的**话。
 *
 * 判据的反面：一段中文的读者是写代码的人 ⇒ 断言（`throw`）；是排障的人 ⇒ log；都不是 ⇒ 不属于本表。
 */

import type { ErrorCode } from './result';

/**
 * 「宿主返回认不出」的唯一一句。
 *
 * 两处要用同一句话：`MSG.badPayload`（代码里直接取）与 `codeReason.PS_BAD_PAYLOAD`
 * （`unwrapRaw` 按码查表）。字面量只写在这里，两处都引用它。
 */
const BAD_PAYLOAD = '返回数据无法识别';

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
  badPayload: BAD_PAYLOAD,

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
    /** 官方逐字：删到只剩一个仓库 */
    keepOneWarehouse: '最少保留一个分组哦',
    /** 官方逐字：带星号，与页面空态那句不是同一件事 */
    emptyGroup: '*该分组没有动作',

    /* 页面与控件 */

    /* 右键菜单 */

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
    guideTitle: '欢迎首次使用',
    guideAsk: '是否导入自带动作预设？含有修图 / 新建文档等功能',
    guideImport: '导入'
  },

  /**
   * 重命名页（`06`）：只收「系统告诉用户发生了什么」的话 —— 输入校验、模型层守卫、进度、成功、空态、确认。
   *
   * **控件标题 / 菜单项 / 选项名 / placeholder 不在这里**（按钮叫「应用」、字段叫「重命名图层」、
   * 菜单项叫「创建新组」都不是「发生了什么」），按 `CONVENTIONS` §12 的判据就近写在
   * `features/rename` 的调用点。`MSG` 文件头那句「不收界面文字」说的就是这件事。
   */
  rename: {
    /* 输入校验（官方逐字） */
    expressionEmpty: '不能输入空字符哦',
    needGroupName: '请输入组名',
    needNewGroupName: '请输入新组名',
    needPresetText: '请输入预设文本',
    needReplaceBoth: '替换前后两段文字都要填',

    /* 模型层守卫（第 0 组由程序写） */
    groupLocked: '「最近使用」不可改名、删除或加项',

    /* 进度 / 成功 / 空态 */
    renaming: '正在批量重命名',
    doneExport: '导出成功',
    doneImport: '导入成功',
    emptyPreset: '还没有重命名预设',

    /* 确认 */
    confirmDeleteGroup: '删除分组'
  },

  /**
   * 模板库：只收「系统告诉用户发生了什么」的话（失败 / 空态 / 校验）。
   *
   * 菜单项（重命名 / 编辑源文件 / 更新预览图 / 移动到… / 打开库目录 / 删除）、
   * 按钮（新建文件夹 / 从选中图层存入）、底栏「共 N 个内容」都不在这里 —— 那些是界面文字，
   * 就近写在页面或组件里。
   */
  template: {
    /* 输入校验 / 模型守卫（domain 产出） */
    badName: '名称不能为空',
    folderNameTaken: '同一文件夹里已经有同名文件夹了',
    folderNotEmpty: '这个文件夹不是空的，先清空再删',

    /* 前提（PS 侧） */
    noSelection: '请先选中一个图层',

    /* 失败 */
    saveFailed: '存入模板失败',
    thumbFailed: '更新预览图失败',
    useFailed: '应用模板失败',
    openFailed: '打开模板失败',
    openDirFailed: '打开库目录失败',

    /* 空态 */
    /* 指向**界面上真实存在的位置**：存入口是右下角一个纯图标按钮（没有文字），
       原文案写「点『从选中图层存入』」—— 那六个字屏幕上根本没有，用户照着找不到 */
    emptyLibrary: '还没有模板：选中一个图层后，点右下角的按钮存一条',
    emptyFolder: '这个文件夹是空的'
  },

  /** 云同步（手动上传 / 下载）：只收失败 / 进度 / 成功 / 空态，按钮与区块标题就近写在设置页 */
  cloud: {
    /** 失败：网关地址被清空（`endpoints.ts` 的常量），一个请求都不发 */
    notConfigured: '地址未配置',
    /**
     * 失败：云端的响应认不出（不是快照 / 缺 unit / 服务端 `{ok:false}`）。
     * 现场（HTTP 状态、缺哪个 unit）一律进 `detail`。
     */
    syncFailed: '同步失败',
    /** 进度：全屏加载文案（`useRunCommand` 的 `tip`） */
    syncing: '正在同步…',
    /** 成功：上传与下载共用一句 */
    done: '同步成功',
    /** 覆盖前确认（上传时云端 rev 比台账新） */
    overwriteAsk: '云端数据更新，确定覆盖吗',
    /** 确认框的确认按钮：默认文案是「删除」，覆盖写不能沿用 */
    overwrite: '覆盖',
    /** 状态行：台账为空（从未同步过） */
    never: '还没有同步过',
    /** 失败：云端从没上传过就点下载（服务端回 `data:null`） */
    empty: '云端还没有数据'
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

    /* 嵌入面板 */

    /* 导入面板 */

    /* 优化面板 */

    /* 参考线面板 */

    /* 间距面板 */

    /* 自定义变换面板 */

    /* 翻转 6 向的悬停文案（`direction` 是传给 jsx 的参数值，**不进本表**） */

    /* 导出面板（标签 / 标题 / 单选文案；全部官方逐字，M 组已核） */
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


    /* 吸色 / 解析图片 */
    dropOneImage: '请拖入1张图片',
    parseImageFailed: '解析图片失败',

    confirmDeleteMessage:
      '会直接改写库文件，原文件已备份为同目录下的 .bak（回滚：把 .bak 复制回同名文件）',

    /* repo 层：文件名（进 `${label}不是合法 JSON`）、索引缺登记的提示、新建分组默认名 */
    noLibraryFile: '索引里没有登记这个库的文件名',
    /* repo 层：`.kux` 导入的四条校验（现场一律进 `detail`：`name:` / `file:`） */
    kuBadFileName: '导入文件名不合法',
    kuDuplicateFileName: '导入文件名重复',
    kuMissingFile: '索引引用的库文件不在包里',
    kuInnerBroken: '导入文件内层结构不认识',

    /* 命令层：默认名、新建组名、吸色结果、文件对话框标题 */
    pickTimeout: '吸色超时（60 秒内没有取色）',
  },

  /**
   * 诊断页（`features/home`）：只收「系统告诉用户发生了什么」——确认句、成功提示、空态、校验。
   *
   * 按钮名 / 分区标题 / 字段 label / placeholder / 诊断行标签是**界面文字**（`CONVENTIONS` §12），
   * 已就地写回 `features/home/HomePage.tsx`（`TD-04-2` 已结）。
   */
  home: {
    reachable: '接口可达',
    emptyLog: '（日志为空）',
    logNotLoaded: '还没读取，点「查看日志」',
    cleared: '日志已删除',
    clearTitle: '删除日志？',
    clearMessage: '删除后无法恢复。',
    clearConfirm: '删除',
    nothingToCopy: '没有可复制的内容',
    layerEmpty: '—',
    copiedDiag: '已复制诊断结果',
    copiedLog: '已复制日志',
    scriptEmpty: '先输入要执行的代码',
    scriptNoOutput: '（无返回值）',
    copiedScript: '已复制执行结果'
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
    writeBack: '当前图层不支持写回译文',
    scale: '当前图层不支持缩放',
    clearGuide: '清除参考线失败',
    sliceByGuide: '按参考线切片失败',
    openFolder: '打开所在目录失败',
    relink: '转链接智能对象失败',
    optimizeDoc: '优化文档失败',
    batchName: '批量重命名失败',
    layerColor: '设置图层颜色失败'
  },

  /** 批量文字（新建 / 改字）：弹窗底部的状态行与写回失败 */
  textBatch: {
    lineCountMismatch: '行数与图层数不一致，不能增删行',
    writePartial: '有图层没写成（已锁定或已删除）',
    fontMissing: '字体缺失，已改用 PS 默认字体',
    emptyDraft: '还没有输入文字'
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
    PS_BAD_PAYLOAD: BAD_PAYLOAD,
    NETWORK: '网络请求失败',
    TIMEOUT: '等待超时',
    AUTH: '没有权限，请重新登录',
    FORBIDDEN: '当前操作不被允许',
    CANCELLED: '已取消',
    UNKNOWN: '未知错误'
  } as Record<ErrorCode, string>

} as const;
