// Make.com에서 사용할 슬랙 메시지 포매터
function formatTradingSignals(data) {
    const result = data[0]; // 배열의 첫 번째 요소
    
    let message = `🐢 **터틀 트레이딩 신호** (${result.timestamp.slice(0, 10)})\n\n`;
    
    // 터틀 트레이딩 신호
    if (result.turtleTrading.signals.length > 0) {
        result.turtleTrading.signals.forEach(signal => {
            const emoji = signal.action === 'BUY' ? '📈' : '📉';
            message += `${emoji} **${signal.name}** (${signal.symbol})\n`;
            message += `   • 액션: ${signal.action}\n`;
            message += `   • 현재가: ${signal.currentPrice.toLocaleString()}원\n`;
            message += `   • ${signal.reasoning}\n\n`;
        });
    } else {
        message += "오늘은 터틀 트레이딩 신호가 없습니다.\n\n";
    }
    
    // 슈퍼스톡 우량주
    message += `⭐ **슈퍼스톡 우량주 Top 5**\n\n`;
    if (result.superstocks.qualifiedStocks.length > 0) {
        result.superstocks.qualifiedStocks.forEach((stock, index) => {
            message += `${index + 1}. **${stock.name}** (${stock.symbol})\n`;
            message += `   • 현재가: ${stock.currentPrice.toLocaleString()}원\n`;
            message += `   • 매출성장: ${stock.revenueGrowth3Y}%\n`;
            message += `   • 순이익성장: ${stock.netIncomeGrowth3Y}%\n`;
            message += `   • PSR: ${stock.psr}\n\n`;
        });
    } else {
        message += "조건을 만족하는 슈퍼스톡이 없습니다.\n\n";
    }
    
    return message;
}

// Make.com에서 사용할 함수 (텍스트 변환용)
function convertToSlackMessage(jsonData) {
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        return formatTradingSignals(data);
    } catch (error) {
        return `❌ 데이터 처리 중 오류가 발생했습니다: ${error.message}`;
    }
}

// Make.com 웹훅 응답용 간단한 변환
function makeCompatibleFormat(data) {
    const result = data[0];
    
    return {
        timestamp: result.timestamp,
        summary: {
            turtleSignalsCount: result.summary.turtleSignals,
            qualifiedStocksCount: result.summary.qualifiedSuperstocks
        },
        turtleSignals: result.turtleTrading.signals.map(signal => ({
            symbol: signal.symbol,
            name: signal.name,
            action: signal.action,
            currentPrice: signal.currentPrice,
            reasoning: signal.reasoning
        })),
        qualifiedStocks: result.superstocks.qualifiedStocks.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            currentPrice: stock.currentPrice,
            revenueGrowth: stock.revenueGrowth3Y,
            netIncomeGrowth: stock.netIncomeGrowth3Y,
            psr: stock.psr
        })),
        slackMessage: formatTradingSignals(data)
    };
}

module.exports = {
    formatTradingSignals,
    convertToSlackMessage,
    makeCompatibleFormat
};