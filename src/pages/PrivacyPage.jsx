import { Link } from 'react-router-dom'
import '../styles/legalPages.css'

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-page__inner">
        <h1 className="legal-page__title">隐私政策</h1>
        <p className="legal-page__updated">最近更新：请替换为实际日期</p>
        <div className="legal-page__body">
          <div className="legal-page__placeholder">
            以下为占位说明，请替换为正式隐私政策。发布前建议由法务或合规审核，并与 Supabase 数据处理实践一致。
          </div>
          <h2>1. 我们收集的信息</h2>
          <ul>
            <li>账户信息：如邮箱、昵称等您在注册或设置中提供的内容。</li>
            <li>使用数据：如功能使用、积分变动记录等为实现服务所必需的数据。</li>
            <li>您主动上传的产品信息、图片及生成报告等，用于提供分析与展示功能。</li>
          </ul>
          <h2>2. 我们如何使用信息</h2>
          <p>用于提供、维护与改进服务，包括身份验证、积分与账户管理、客户支持及安全风控。</p>
          <h2>3. 存储与第三方服务</h2>
          <p>
            本服务可能使用 Supabase 等云服务商进行身份认证与数据存储。数据处理受其隐私政策与服务条款约束；我们不会向无关第三方出售您的个人信息。
          </p>
          <h2>4. Cookie 与本地存储</h2>
          <p>我们可能使用浏览器本地存储或类似技术以维持登录状态与偏好设置。</p>
          <h2>5. 您的权利</h2>
          <p>
            在适用法律范围内，您可访问、更正或删除部分个人信息，或撤回同意。具体流程以我们提供的账户功能或客服渠道为准。
          </p>
          <h2>6. 未成年人</h2>
          <p>若您为未成年人，请在监护人同意与指导下使用本服务。</p>
          <h2>7. 政策更新</h2>
          <p>我们可能适时更新本政策，更新后将在本页展示并注明生效日期。</p>
          <h2>8. 联系我们</h2>
          <p>有关本隐私政策的疑问，请通过产品内提供的联系方式与我们联系。</p>
          <div className="legal-page__links">
            <Link to="/terms">用户协议</Link>
            <Link to="/billing">计费说明</Link>
            <Link to="/">返回首页</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
