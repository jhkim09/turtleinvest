const mongoose = require('mongoose');

const stockNameSchema = new mongoose.Schema({
  // 종목 기본 정보
  stockCode: {
    type: String,
    required: true,
    unique: true
  },
  
  // 회사명 정보
  companyName: {
    type: String,
    required: true
  },
  
  companyNameEn: {
    type: String,
    default: ''
  },
  
  // 시장 정보
  market: {
    type: String,
    enum: ['KOSPI', 'KOSDAQ', 'KONEX', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  
  // 업종 분류
  industry: {
    type: String,
    default: ''
  },
  
  // 데이터 수집 정보
  dataSource: {
    type: String,
    enum: ['DART', 'KRX', 'MANUAL', 'ESTIMATED'],
    default: 'MANUAL'
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'stockNames'
});

// 인덱스 설정
stockNameSchema.index({ stockCode: 1 });
stockNameSchema.index({ market: 1, isActive: 1 });

// 정적 메서드: 종목명 조회
stockNameSchema.statics.getStockName = async function(stockCode) {
  try {
    const stock = await this.findOne({ stockCode: stockCode, isActive: true });
    return stock ? stock.companyName : null;
  } catch (error) {
    console.error(`종목명 조회 실패 (${stockCode}):`, error);
    return null;
  }
};

// 정적 메서드: 대량 종목명 조회
stockNameSchema.statics.getBulkStockNames = async function(stockCodes) {
  try {
    const stocks = await this.find({ 
      stockCode: { $in: stockCodes }, 
      isActive: true 
    });
    
    const nameMap = new Map();
    stocks.forEach(stock => {
      nameMap.set(stock.stockCode, stock.companyName);
    });
    
    return nameMap;
  } catch (error) {
    console.error('대량 종목명 조회 실패:', error);
    return new Map();
  }
};

// 정적 메서드: 종목명 저장/업데이트
stockNameSchema.statics.saveStockName = async function(stockCode, companyName, options = {}) {
  try {
    const stockData = {
      stockCode: stockCode,
      companyName: companyName,
      companyNameEn: options.companyNameEn || '',
      market: options.market || this.guessMarket(stockCode),
      industry: options.industry || '',
      dataSource: options.dataSource || 'MANUAL',
      lastUpdated: new Date(),
      isActive: true,
      notes: options.notes || ''
    };

    const result = await this.updateOne(
      { stockCode: stockCode },
      { $set: stockData },
      { upsert: true }
    );

    console.log(`✅ ${stockCode} 종목명 저장: ${companyName}`);
    return result;
    
  } catch (error) {
    console.error(`종목명 저장 실패 (${stockCode}):`, error);
    throw error;
  }
};

// 시장 추정
stockNameSchema.statics.guessMarket = function(stockCode) {
  const firstDigit = stockCode.charAt(0);
  if (['0', '1'].includes(firstDigit)) return 'KOSPI';
  if (['2', '3', '4'].includes(firstDigit)) return 'KOSDAQ';
  if (stockCode.startsWith('9')) return 'KOSDAQ'; // 9로 시작하는 것도 코스닥
  return 'UNKNOWN';
};

const StockName = mongoose.model('StockName', stockNameSchema);

module.exports = StockName;