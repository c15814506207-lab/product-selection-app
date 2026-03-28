export default function AppHero({ showReportEntry, onOpenReport }) {
  return (
    <header className="app-hero">
      <div className="app-hero__top">
        <div className="app-hero__body">
          <div className="app-hero__eyebrow">工作台</div>
          <h1 className="app-hero__title">三产品决策与优化流程</h1>
          <p className="app-hero__lead">
            在同一页面完成录入、分析、优化与版本管理；需要时再进入「市场模拟」做对照与迭代闭环。界面与流程会持续打磨，优先保证你能顺畅完成选品决策。
          </p>
        </div>
        {showReportEntry && onOpenReport ? (
          <button type="button" onClick={onOpenReport} className="app-hero__report no-print">
            查看报告 / 打印
          </button>
        ) : null}
      </div>
    </header>
  )
}
