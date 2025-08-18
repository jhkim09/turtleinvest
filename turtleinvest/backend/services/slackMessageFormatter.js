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
          message += `${index + 1}. **${stock.name}** (${stock.symbol})\n`;
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
  
  // 간단한 테스트용 포맷터
  static formatTest(data) {
    return `🧪 **테스트 메시지**\n\n${JSON.stringify(data, null, 2)}`;
  }
}

module.exports = SlackMessageFormatter;