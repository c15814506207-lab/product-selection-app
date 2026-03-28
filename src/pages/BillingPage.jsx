import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { requestAlipayPagePay } from '../api/alipayCheckoutClient'
import '../styles/legalPages.css'

const PACKS = [
  { id: 'p100', label: '100 积分' },
  { id: 'p500', label: '500 积分' },
  { id: 'p1000', label: '1000 积分' },
]

export default function BillingPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [paidNotice, setPaidNotice] = useState(false)

  useEffect(() => {
    if (window.location.hash === '#alipay-pay') {
      document.getElementById('alipay-pay')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('paid') !== '1' && params.get('return') !== 'alipay') return
    setPaidNotice(true)
    navigate({ pathname: '/billing', search: '' }, { replace: true })
  }, [location.search, navigate])

  async function handlePack(packId) {
    setCheckoutError('')
    setCheckoutLoading(packId)
    try {
      await requestAlipayPagePay(packId)
    } catch (e) {
      setCheckoutError(e?.message || '无法跳转支付宝，请稍后重试或联系管理员')
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="legal-page">
      <div className="legal-page__inner">
        <h1 className="legal-page__title">计费说明</h1>
        <p className="legal-page__updated">与站内积分、充值提示保持一致；正式价格与活动以届时公示为准。</p>

        {paidNotice ? (
          <div className="legal-page__paid-banner" role="status">
            若您已在支付宝完成付款，积分将在异步通知入账后显示在工作台（通常很快）。若长时间未到账，请把商户订单号或支付宝交易号发给管理员核对。
          </div>
        ) : null}

        <div className="legal-page__body">
          <section id="alipay-pay" className="legal-page__pay-wrap">
            <h2 className="legal-page__pay-title">在线购买积分（支付宝）</h2>
            <p className="legal-page__pay-lead">
              使用支付宝「电脑网站支付」跳转收银台；支付结果以支付宝异步通知为准，无需在浏览器提交商户密钥。若未配置开放平台或未部署对应函数，请使用下方「联系管理员」方式开通测试额度。
            </p>
            {!user ? (
              <p className="legal-page__pay-login">
                请先 <Link to="/">返回首页</Link> 登录后再购买。
              </p>
            ) : (
              <div className="legal-page__pay-actions">
                {PACKS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="legal-page__pay-btn"
                    disabled={!!checkoutLoading}
                    onClick={() => void handlePack(p.id)}
                  >
                    {checkoutLoading === p.id ? '跳转中…' : `支付宝购买 ${p.label}`}
                  </button>
                ))}
              </div>
            )}
            {checkoutError ? <p className="legal-page__pay-err">{checkoutError}</p> : null}
            <p className="legal-page__pay-hint">
              需在支付宝开放平台创建应用、开通「电脑网站支付」，并在 Supabase 配置 <code>ALIPAY_*</code> Secrets、部署{' '}
              <code>create-alipay-page-pay</code> 与 <code>alipay-notify</code>；异步通知 URL 须为公网 HTTPS。
            </p>
          </section>

          <h2>1. 积分是什么</h2>
          <p>
            积分用于使用本产品中会调用云端大模型或相关 API 的功能（例如选品分析、产品优化等）。积分不是法定货币，不能兑换现金，仅在当前服务范围内按规则抵扣使用。
          </p>

          <h2>2. 如何扣费</h2>
          <p>
            在您发起分析、优化等操作时，系统会按次预估并在实际产生消耗后从账户积分中扣减。扣费由服务端完成；若积分不足，相关操作将无法完成，请先获得足够额度后再试。
          </p>
          <p>
            您可在分析工作台顶部查看当前积分余额，并在「积分消耗记录」中查看近期的消耗明细（展示以产品内为准）。
          </p>

          <h2>3. 充值与额度</h2>
          <p>
            <strong>在线支付（支付宝）：</strong>
            见上方「在线购买积分」。支付完成后由服务端根据支付宝异步通知入账。
          </p>
          <p>
            <strong>测试额度 / 人工开通：</strong>
            在尚未完成支付配置或需临时调额时，可联系运营 / 管理员协助；请勿向个人转账所谓「代充」。
          </p>

          <h2>4. 余额与记录</h2>
          <p>
            账户积分余额以服务端记录为准。若出现网络异常导致界面与后台短暂不一致，请稍后刷新；持续异常请通过产品内联系方式反馈。
          </p>

          <h2>5. 退款与争议</h2>
          <p>
            涉及支付宝收款的退款与争议，按支付宝规则及您与运营方另行约定执行；其余情形以届时公布的用户协议、本页更新内容及客服答复为准。
          </p>

          <h2>6. 与协议的关系</h2>
          <p>
            本说明是对积分与计费事项的摘要；未尽事宜以
            <Link to="/terms">《用户协议》</Link>
            及
            <Link to="/privacy">《隐私政策》</Link>
            为准。
          </p>

          <div className="legal-page__links">
            <Link to="/terms">用户协议</Link>
            <Link to="/privacy">隐私政策</Link>
            <Link to="/">返回首页</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
