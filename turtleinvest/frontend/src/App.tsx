import React, { useState, useEffect } from 'react';
import './App.css';

interface Portfolio {
  userId: string;
  currentCash: number;
  totalEquity: number;
  portfolioValue: number;
  totalReturn: number;
  currentRiskExposure: number;
  positions: Position[];
  riskSettings: RiskSettings;
  stats: Stats;
}

interface TradeRecord {
  symbol: string;
  name: string;
  action: string;
  quantity: number;
  price: number;
  executedAt: string;
  realizedPL: number;
  signal: string;
}

interface Position {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPL: number;
  stopLossPrice: number;
  entryDate: string;
  entrySignal: string;
  atr: number;
  riskAmount: number;
}

interface RiskSettings {
  maxRiskPerTrade: number;
  maxTotalRisk: number;
  minCashReserve: number;
}

interface Stats {
  totalTrades: number;
  winningTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  profitFactor: number;
}

interface Signal {
  symbol: string;
  name: string;
  signalType: string;
  currentPrice: number;
  recommendedAction: {
    action: string;
    quantity: number;
    riskAmount: number;
    reasoning: string;
  };
}

function App() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [tradeStats, setTradeStats] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('portfolio');
  const [kiwoomConnected, setKiwoomConnected] = useState(false);

  const API_BASE = 'https://turtleinvest.onrender.com/api';

  useEffect(() => {
    loadPortfolio();
    loadSignals();
    loadTrades();
  }, []);

  const loadPortfolio = async () => {
    try {
      console.log('API 호출 시작:', `${API_BASE}/positions`);
      const response = await fetch(`${API_BASE}/positions`);
      console.log('API 응답 상태:', response.status);
      const data = await response.json();
      console.log('API 응답 데이터:', data);
      if (data.success) {
        setPortfolio(data.portfolio);
        setKiwoomConnected(data.kiwoomConnected || false);
      }
    } catch (error) {
      console.error('포트폴리오 로드 실패:', error);
      console.error('에러 상세:', error instanceof Error ? error.message : String(error));
    }
  };

  const loadSignals = async () => {
    try {
      const response = await fetch(`${API_BASE}/signals/latest?limit=5`);
      const data = await response.json();
      if (data.success) {
        setSignals(data.signals);
      }
    } catch (error) {
      console.error('신호 로드 실패:', error);
    }
  };

  const loadTrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/trades?limit=10`);
      const data = await response.json();
      if (data.success) {
        setTrades(data.trades);
        setTradeStats(data.stats);
      }
    } catch (error) {
      console.error('거래기록 로드 실패:', error);
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE}/signals/analyze`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setSignals(data.signals);
        alert(`분석 완료: ${data.count}개 신호 발견`);
      }
    } catch (error) {
      console.error('분석 실패:', error);
      alert('분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatCurrency = (num: number) => {
    return `₩${formatNumber(num)}`;
  };

  if (!portfolio) {
    return (
      <div className="loading">
        <div>🐢 TurtleInvest 로딩 중...</div>
        <div style={{marginTop: '1rem', fontSize: '0.9rem', color: '#666'}}>
          백엔드 연결 중... (http://localhost:9000)
        </div>
        <div style={{marginTop: '0.5rem', fontSize: '0.8rem', color: '#999'}}>
          F12 → 콘솔에서 에러 확인 가능
        </div>
      </div>
    );
  }

  return (
    <div className="turtle-app">
      <header className="app-header">
        <h1>🐢 TurtleInvest</h1>
        <p>터틀트레이딩 전략 기반 자동 투자 시스템</p>
        <nav className="nav-tabs">
          <button 
            className={activeTab === 'portfolio' ? 'active' : ''}
            onClick={() => setActiveTab('portfolio')}
          >
            포트폴리오
          </button>
          <button 
            className={activeTab === 'signals' ? 'active' : ''}
            onClick={() => setActiveTab('signals')}
          >
            신호분석
          </button>
          <button 
            className={activeTab === 'trades' ? 'active' : ''}
            onClick={() => setActiveTab('trades')}
          >
            매매기록
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === 'portfolio' && (
          <div className="portfolio-section">
            <div className="portfolio-summary">
              <div className="summary-card">
                <h3>💰 총 자산</h3>
                <div className="value">{formatCurrency(portfolio.portfolioValue)}</div>
                <div className="change">
                  수익률: {(portfolio.totalReturn || 0).toFixed(2)}%
                </div>
              </div>
              <div className="summary-card">
                <h3>💵 현금</h3>
                <div className="value">{formatCurrency(portfolio.currentCash)}</div>
              </div>
              <div className="summary-card">
                <h3>⚡ 리스크 노출</h3>
                <div className="value">{formatCurrency(portfolio.currentRiskExposure)}</div>
                <div className="change">
                  {((portfolio.currentRiskExposure || 0) / (portfolio.totalEquity || 1) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="summary-card">
                <h3>📊 보유종목</h3>
                <div className="value">{portfolio.positions.length}개</div>
              </div>
            </div>

            <div className="positions-table">
              <h3>보유 포지션</h3>
              {portfolio.positions.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>종목명</th>
                      <th>수량</th>
                      <th>평균단가</th>
                      <th>현재가</th>
                      <th>평가손익</th>
                      <th>손절가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.positions.map((position, index) => (
                      <tr key={index}>
                        <td>
                          <div>
                            <strong>{position.name}</strong>
                            <small>({position.symbol})</small>
                          </div>
                        </td>
                        <td>{formatNumber(position.quantity)}주</td>
                        <td>{formatCurrency(position.avgPrice)}</td>
                        <td>{formatCurrency(position.currentPrice)}</td>
                        <td className={position.unrealizedPL >= 0 ? 'profit' : 'loss'}>
                          {formatCurrency(position.unrealizedPL)}
                        </td>
                        <td>{formatCurrency(position.stopLossPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  현재 보유 중인 포지션이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="signals-section">
            <div className="signals-header">
              <h3>🔍 터틀 신호 분석</h3>
              <button 
                className="analyze-btn"
                onClick={runAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '분석 중...' : '신호 분석 실행'}
              </button>
            </div>

            <div className="signals-list">
              {signals.length > 0 ? (
                signals.map((signal, index) => (
                  <div key={index} className="signal-card">
                    <div className="signal-header">
                      <h4>{signal.name} ({signal.symbol})</h4>
                      <span className={`signal-type ${signal.signalType.toLowerCase()}`}>
                        {signal.signalType}
                      </span>
                    </div>
                    <div className="signal-details">
                      <div className="detail-item">
                        <span>현재가:</span>
                        <span>{formatCurrency(signal.currentPrice)}</span>
                      </div>
                      {signal.recommendedAction && (
                        <>
                          <div className="detail-item">
                            <span>추천액션:</span>
                            <span>{signal.recommendedAction.action}</span>
                          </div>
                          <div className="detail-item">
                            <span>추천수량:</span>
                            <span>{formatNumber(signal.recommendedAction.quantity)}주</span>
                          </div>
                          <div className="detail-item">
                            <span>리스크:</span>
                            <span>{formatCurrency(signal.recommendedAction.riskAmount)}</span>
                          </div>
                          <div className="reasoning">
                            {signal.recommendedAction.reasoning}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  현재 발견된 신호가 없습니다. '신호 분석 실행' 버튼을 눌러 분석을 시작하세요.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="trades-section">
            <div className="trades-header">
              <h3>📈 매매 기록</h3>
              <div className="connection-status">
                {kiwoomConnected ? (
                  <span className="connected">🟢 키움 연결됨</span>
                ) : (
                  <span className="disconnected">🔴 시뮬레이션 모드</span>
                )}
              </div>
            </div>
            
            <div className="stats-summary">
              {tradeStats && (
                <>
                  <div className="stat-item">
                    <span>총 거래:</span>
                    <span>{tradeStats.totalTrades}회</span>
                  </div>
                  <div className="stat-item">
                    <span>승률:</span>
                    <span>{(tradeStats.winRate || 0).toFixed(1)}%</span>
                  </div>
                  <div className="stat-item">
                    <span>총 수익:</span>
                    <span className="profit">{formatCurrency(tradeStats.totalProfit)}</span>
                  </div>
                  <div className="stat-item">
                    <span>총 손실:</span>
                    <span className="loss">{formatCurrency(tradeStats.totalLoss)}</span>
                  </div>
                  <div className="stat-item">
                    <span>수익비:</span>
                    <span>{(tradeStats.profitFactor || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="trades-table">
              {trades.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>종목명</th>
                      <th>구분</th>
                      <th>수량</th>
                      <th>체결가</th>
                      <th>실현손익</th>
                      <th>체결시간</th>
                      <th>신호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, index) => (
                      <tr key={index}>
                        <td>
                          <div>
                            <strong>{trade.name}</strong>
                            <small>({trade.symbol})</small>
                          </div>
                        </td>
                        <td>
                          <span className={`action ${trade.action.toLowerCase()}`}>
                            {trade.action}
                          </span>
                        </td>
                        <td>{formatNumber(trade.quantity)}주</td>
                        <td>{formatCurrency(trade.price)}</td>
                        <td className={trade.realizedPL >= 0 ? 'profit' : 'loss'}>
                          {formatCurrency(trade.realizedPL)}
                        </td>
                        <td>{new Date(trade.executedAt).toLocaleDateString()}</td>
                        <td>
                          <span className="signal-badge">{trade.signal}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  거래 기록이 없습니다. 터틀 트레이딩 신호가 발생하면 자동으로 기록됩니다.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
