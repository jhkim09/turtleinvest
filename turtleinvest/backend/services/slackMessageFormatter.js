// 슬랙 메시지 포매터 서비스
class SlackMessageFormatter {
  
  // 터틀 + 슈퍼스톡 통합 분석 결과를 슬랙 메시지로 변환
  static formatIntegratedAnalysis(analysisResult) {
    try {
      const timestamp = new Date(analysisResult.timestamp).toLocaleDateString('ko-KR');
      let message = `🐢 **터틀 트레이딩 신호** (${timestamp})\n\n`;
      
      // 터틀 트레이딩 신호
      if (analysisResult.turtleTrading.signals.length > 0) {
        analysisResult.turtleTrading.signals.forEach(signal => {
          const emoji = signal.action === 'BUY' ? '📈' : signal.action === 'SELL' ? '📉' : '⏸️';
          message += `${emoji} **${signal.name}** (${signal.symbol})\n`;
          message += `   • 액션: ${signal.action}\n`;
          message += `   • 현재가: ${signal.currentPrice.toLocaleString()}원\n`;
          if (signal.reasoning) {
            message += `   • ${signal.reasoning}\n`;
          }
          message += '\n';
        });
      } else {
        message += "오늘은 터틀 트레이딩 신호가 없습니다.\n\n";
      }
      
      // 슈퍼스톡 우량주
      message += `⭐ **슈퍼스톡 우량주**\n\n`;
      if (analysisResult.superstocks.qualifiedStocks && analysisResult.superstocks.qualifiedStocks.length > 0) {
        // Top 5개만 표시
        const topStocks = analysisResult.superstocks.qualifiedStocks.slice(0, 5);
        topStocks.forEach((stock, index) => {
          const dataSourceEmoji = stock.dataSource === 'DART_REALTIME' ? '📊' : '💡';
          const dataSourceText = stock.dataSource === 'DART_REALTIME' ? 'DART' : 'EST';
          message += `${index + 1}. **${stock.name}** (${stock.symbol}) ${dataSourceEmoji}${dataSourceText}\n`;
          message += `   • 현재가: ${stock.currentPrice.toLocaleString()}원\n`;
          message += `   • 매출성장: ${stock.revenueGrowth3Y.toFixed(1)}%\n`;
          message += `   • 순이익성장: ${stock.netIncomeGrowth3Y.toFixed(1)}%\n`;
          message += `   • PSR: ${stock.psr.toFixed(2)}\n\n`;
        });
      } else {
        message += "조건을 만족하는 슈퍼스톡이 없습니다.\n\n";
      }
      
      // 프리미엄 기회 (터틀 + 슈퍼스톡 겹치는 경우)
      if (analysisResult.premiumOpportunities && analysisResult.premiumOpportunities.length > 0) {
        message += `💎 **프리미엄 기회** (터틀 + 슈퍼스톡)\n\n`;
        analysisResult.premiumOpportunities.forEach(stock => {
          message += `🎯 **${stock.name}** (${stock.symbol})\n`;
          message += `   • 터틀신호: ${stock.turtleSignal}\n`;
          message += `   • 슈퍼스톡점수: ${stock.superstocksScore}\n`;
          message += `   • 현재가: ${stock.currentPrice.toLocaleString()}원\n\n`;
        });
      }
      
      // 투자 설정 요약
      if (analysisResult.investmentSettings) {
        message += `💰 **투자설정**: ${analysisResult.investmentSettings.budgetDisplay} 예산, 종목당 리스크 ${analysisResult.investmentSettings.riskDisplay}\n`;
      }
      
      // 요약 정보
      const summary = analysisResult.summary;
      message += `📊 **요약**: 터틀신호 ${summary.turtleSignals}개, 슈퍼스톡 ${summary.qualifiedSuperstocks}개`;
      if (summary.hasOverlap) {
        message += `, 겹치는 종목 ${summary.overlappingStocks}개`;
      }
      
      return message;
      
    } catch (error) {
      console.error('슬랙 메시지 포맷 실패:', error);
      return `❌ 데이터 처리 중 오류가 발생했습니다: ${error.message}`;
    }
  }
  
  // 매도 신호 전용 포맷터
  static formatSellSignals(sellAnalysisResult) {
    try {
      const timestamp = new Date(sellAnalysisResult.timestamp).toLocaleDateString('ko-KR');
      let message = `📉 **매도 신호 알림** (${timestamp})\n\n`;
      
      if (sellAnalysisResult.sellSignals.length > 0) {
        sellAnalysisResult.sellSignals.forEach(signal => {
          const urgencyEmoji = signal.urgency === 'HIGH' ? '🚨' : '⚠️';
          message += `${urgencyEmoji} **${signal.name}** (${signal.symbol})\n`;
          message += `   • 매도이유: ${signal.sellReason}\n`;
          message += `   • 현재가: ${signal.currentPrice.toLocaleString()}원\n`;
          message += `   • 보유수량: ${signal.position.quantity}주\n`;
          message += `   • 손익: ${signal.position.unrealizedPL.toLocaleString()}원\n\n`;
        });
      } else {
        message += "현재 매도 신호가 발생한 종목이 없습니다.\n\n";
      }
      
      // 계좌 요약
      if (sellAnalysisResult.accountSummary) {
        const account = sellAnalysisResult.accountSummary;
        message += `💼 **계좌현황**: 총자산 ${account.totalAsset.toLocaleString()}원, 보유종목 ${account.positionCount}개`;
      }
      
      return message;
      
    } catch (error) {
      console.error('매도 신호 메시지 포맷 실패:', error);
      return `❌ 매도 신호 데이터 처리 중 오류가 발생했습니다: ${error.message}`;
    }
  }
  
  // BUY 신호 전용 포맷터
  static formatBuySignals(buyAnalysisResult) {
    try {
      const timestamp = new Date(buyAnalysisResult.timestamp).toLocaleDateString('ko-KR');
      let message = `📈 **매수 신호 알림** (${timestamp})\n\n`;
      
      // 터틀 BUY 신호
      if (buyAnalysisResult.buySignals.turtle && buyAnalysisResult.buySignals.turtle.length > 0) {
        message += `🐢 **터틀 매수 신호**\n\n`;
        buyAnalysisResult.buySignals.turtle.forEach(signal => {
          message += `📈 **${signal.name}** (${signal.symbol})\n`;
          message += `   • 액션: ${signal.action}\n`;
          message += `   • 현재가: ${signal.currentPrice.toLocaleString()}원\n`;
          message += `   • 신호: ${signal.signalType}\n`;
          if (signal.reasoning) {
            message += `   • ${signal.reasoning}\n`;
          }
          message += '\n';
        });
      }
      
      // 슈퍼스톡 BUY 후보
      if (buyAnalysisResult.buySignals.superstocks && buyAnalysisResult.buySignals.superstocks.length > 0) {
        message += `⭐ **슈퍼스톡 매수 후보**\n\n`;
        buyAnalysisResult.buySignals.superstocks.forEach((stock, index) => {
          const dataSourceEmoji = stock.dataSource === 'DART_REALTIME' ? '📊' : '💡';
          const dataSourceText = stock.dataSource === 'DART_REALTIME' ? 'DART' : 'EST';
          message += `${index + 1}. **${stock.name}** (${stock.symbol}) ${dataSourceEmoji}${dataSourceText}\n`;
          message += `   • 현재가: ${stock.currentPrice.toLocaleString()}원\n`;
          message += `   • 매출성장: ${stock.revenueGrowth3Y.toFixed(1)}%\n`;
          message += `   • 순이익성장: ${stock.netIncomeGrowth3Y.toFixed(1)}%\n`;
          message += `   • PSR: ${stock.psr.toFixed(2)}\n`;
          message += `   • 등급: ${stock.score}\n\n`;
        });
      }
      
      // 프리미엄 매수 기회 (터틀 + 슈퍼스톡 겹치는 경우)
      if (buyAnalysisResult.buySignals.premium && buyAnalysisResult.buySignals.premium.length > 0) {
        message += `💎 **프리미엄 매수 기회** (터틀 + 슈퍼스톡)\n\n`;
        buyAnalysisResult.buySignals.premium.forEach(stock => {
          message += `🎯 **${stock.name}** (${stock.symbol})\n`;
          message += `   • 터틀신호: ${stock.turtleSignal}\n`;
          message += `   • 터틀액션: ${stock.turtleAction}\n`;
          message += `   • 슈퍼스톡등급: ${stock.superstocksScore}\n`;
          message += `   • 현재가: ${stock.currentPrice.toLocaleString()}원\n`;
          message += `   • 매출성장: ${stock.superstocksData.revenueGrowth3Y.toFixed(1)}%\n`;
          message += `   • PSR: ${stock.superstocksData.psr.toFixed(2)}\n\n`;
        });
      }
      
      // 투자 설정 요약
      if (buyAnalysisResult.investmentSettings) {
        message += `💰 **투자설정**: ${buyAnalysisResult.investmentSettings.budgetDisplay} 예산, 종목당 리스크 ${buyAnalysisResult.investmentSettings.riskDisplay}\n`;
      }
      
      // 요약 정보
      const summary = buyAnalysisResult.summary;
      message += `📊 **요약**: 터틀 매수신호 ${summary.turtleBuySignals || 0}개, 슈퍼스톡 후보 ${summary.qualifiedSuperstocks || 0}개`;
      if (summary.premiumBuyOpportunities > 0) {
        message += `, 프리미엄 기회 ${summary.premiumBuyOpportunities}개`;
      }
      
      // 매수 기회가 없는 경우
      if (summary.turtleBuySignals === 0 && summary.qualifiedSuperstocks === 0) {
        message += `\n\n⏸️ **오늘은 매수 신호가 없습니다**\n시장 상황을 계속 모니터링하겠습니다.`;
      }
      
      return message;
      
    } catch (error) {
      console.error('BUY 신호 메시지 포맷 실패:', error);
      return `❌ 매수 신호 데이터 처리 중 오류가 발생했습니다: ${error.message}`;
    }
  }
  
  // 포트폴리오 N값 분석 전용 포맷터
  static formatPortfolioNValues(analysisResult) {
    try {
      const timestamp = new Date(analysisResult.timestamp).toLocaleDateString('ko-KR');
      let message = `🐢 **포트폴리오 N값 분석** (${timestamp})\n\n`;
      
      // 보유 종목별 N값 정보
      if (analysisResult.positions && analysisResult.positions.length > 0) {
        message += `📊 **보유 종목 N값 (ATR) 현황**\n\n`;
        
        analysisResult.positions.forEach((position, index) => {
          const profitLossEmoji = (position.unrealizedPLPercent || 0) >= 0 ? '📈' : '📉';
          const riskLevelEmoji = (position.riskPercent || 0) > 5 ? '🚨' : (position.riskPercent || 0) > 3 ? '⚠️' : '✅';
          const nearStopLossEmoji = position.isNearStopLoss ? '🚨' : '🛡️';
          
          message += `${index + 1}. ${nearStopLossEmoji} **${position.name || 'N/A'}** (${position.symbol || 'N/A'})\n`;
          message += `   • 현재가: ${(position.currentPrice || 0).toLocaleString()}원\n`;
          message += `   • 매수가: ${(position.avgPrice || 0).toLocaleString()}원\n`;
          message += `   • N값(ATR): ${(position.nValue || 0).toLocaleString()}원\n`;
          message += `   • 터틀 손절가: ${(position.stopLossPrice || 0).toLocaleString()}원 (매수가 - 2N)\n`;
          message += `   • 보유수량: ${(position.quantity || 0).toLocaleString()}주\n`;
          message += `   ${profitLossEmoji} 손익: ${(position.unrealizedPL || 0).toLocaleString()}원 (${(position.unrealizedPLPercent || 0) >= 0 ? '+' : ''}${position.unrealizedPLPercent || 0}%)\n`;
          message += `   ${riskLevelEmoji} 리스크: ${(position.riskAmount || 0).toLocaleString()}원 (${position.riskPercent || 0}%)\n`;
          
          // 손절가 근접 경고
          if (position.isNearStopLoss) {
            message += `   🚨 **손절가 도달** - 즉시 매도 검토 필요\n`;
          } else if (position.priceFromStopLoss !== null && position.priceFromStopLoss < position.nValue) {
            message += `   ⚠️ 손절가까지 ${Math.round(position.priceFromStopLoss)}원 (1N 이내 위험)\n`;
          }
          
          message += '\n';
        });
        
        // 포트폴리오 전체 요약
        const summary = analysisResult.summary || {};
        message += `📈 **포트폴리오 리스크 요약**\n\n`;
        message += `💰 총 시가: ${(summary.totalMarketValue || 0).toLocaleString()}원\n`;
        message += `🎯 총 리스크: ${(summary.totalRiskAmount || 0).toLocaleString()}원 (${summary.portfolioRiskPercent || 0}%)\n`;
        message += `📊 평균 N값: ${(summary.averageNValue || 0).toLocaleString()}원\n`;
        message += `📍 보유 종목: ${summary.totalPositions || 0}개\n`;
        
        // 위험 경고
        if ((summary.nearStopLossCount || 0) > 0) {
          message += `🚨 **손절 근접**: ${summary.nearStopLossCount || 0}개 종목이 손절가에 근접\n`;
        } else {
          message += `🛡️ **안전 상태**: 모든 종목이 안전한 거리 유지\n`;
        }
        
        // 리스크 레벨 평가
        const riskPercent = summary.portfolioRiskPercent || 0;
        if (riskPercent > 8) {
          message += `⚠️ **고위험**: 포트폴리오 리스크가 8% 초과\n`;
        } else if (riskPercent > 5) {
          message += `📊 **중간위험**: 포트폴리오 리스크 5-8%\n`;
        } else {
          message += `✅ **저위험**: 포트폴리오 리스크 5% 이하\n`;
        }
        
      } else {
        message += `📭 현재 보유 종목이 없습니다.\n\n`;
        message += `🎯 새로운 터틀 매수 신호를 기다리고 있습니다.`;
      }
      
      return message;
      
    } catch (error) {
      console.error('포트폴리오 N값 메시지 포맷 실패:', error);
      return `❌ 포트폴리오 N값 데이터 처리 중 오류가 발생했습니다: ${error.message}`;
    }
  }
  
  // 간단한 테스트용 포맷터
  static formatTest(data) {
    return `🧪 **테스트 메시지**\n\n${JSON.stringify(data, null, 2)}`;
  }
}

module.exports = SlackMessageFormatter;