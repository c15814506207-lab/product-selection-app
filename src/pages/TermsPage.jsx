import { Link } from 'react-router-dom'
import '../styles/legalPages.css'

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-page__inner">
        <h1 className="legal-page__title">用户协议</h1>
        <p className="legal-page__updated">最近更新：请替换为实际日期</p>
        <div className="legal-page__body">
          <div className="legal-page__placeholder">
            以下为占位说明，请替换为贵司/产品正式条款。发布前建议由法务或合规审核。
          </div>
          <h2>1. 服务说明</h2>
          <p>
            Selvora（本服务）向用户提供选品分析、产品优化与报告相关功能。您注册或使用本服务即表示同意本协议。
          </p>
          <h2>2. 账户与使用规范</h2>
          <p>您应保证注册信息真实有效，并对账户下的行为负责。禁止将账户用于违法、侵权或干扰服务正常运行的用途。</p>
          <h2>3. 积分与计费</h2>
          <p>
            积分规则、扣费方式与退款政策以
            <Link to="/billing">《计费说明》</Link>
            及后续正式条款为准。当前若未接入在线支付，以运营方公布的测试或人工开通规则为准。
          </p>
          <h2>4. 内容与知识产权</h2>
          <p>
            您上传或生成的内容权利归属按适用法律与产品说明执行；本服务展示的分析与报告模板等仍受相关法律保护。
          </p>
          <h2>5. 免责声明与责任限制</h2>
          <p>
            AI 生成内容仅供参考，不构成专业意见。在适用法律允许的范围内，本服务对间接损失等免责或限制责任，具体以正式条款为准。
          </p>
          <h2>6. 协议变更与终止</h2>
          <p>我们可能更新本协议，重大变更将通过合理方式提示。您可随时停止使用本服务。</p>
          <h2>7. 联系方式</h2>
          <p>如有疑问，请通过产品内提供的联系方式与我们联系。</p>
          <div className="legal-page__links">
            <Link to="/billing">计费说明</Link>
            <Link to="/privacy">隐私政策</Link>
            <Link to="/">返回首页</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
