const mongoose = require('mongoose');

// 투자 포트폴리오 스키마
const investmentPortfolioSchema = new mongoose.Schema({
  // 기본 정보
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  financialAdvisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  portfolioName: {
    type: String,
    required: true
  },
  
  description: {
    type: String
  },
  
  // 포트폴리오 유형
  portfolioType: {
    type: String,
    enum: ['conservative', 'balanced', 'growth', 'aggressive', 'custom'],
    required: true
  },
  
  // 투자 목표
  investmentGoal: {
    type: String,
    enum: ['retirement', 'education', 'house-purchase', 'wealth-building', 'income-generation'],
    required: true
  },
  
  // 투자 기간
  timeHorizon: {
    type: String,
    enum: ['short-term', 'medium-term', 'long-term'], // 1-3년, 3-7년, 7년+
    required: true
  },
  
  // 포트폴리오 구성
  holdings: [{
    assetName: { type: String, required: true }, // 자산명
    assetType: { 
      type: String, 
      enum: ['stock', 'bond', 'fund', 'etf', 'real-estate', 'commodity', 'cash'],
      required: true 
    },
    ticker: { type: String }, // 종목코드
    quantity: { type: Number, required: true }, // 수량/좌수
    purchasePrice: { type: Number, required: true }, // 매입가
    currentPrice: { type: Number, required: true }, // 현재가
    allocation: { type: Number, required: true }, // 비중 (%)
    purchaseDate: { type: Date, required: true },
    notes: { type: String }
  }],
  
  // 포트폴리오 성과
  performance: {
    totalInvested: { type: Number, default: 0 }, // 총 투자금액
    currentValue: { type: Number, default: 0 }, // 현재 가치
    totalReturn: { type: Number, default: 0 }, // 총 수익
    returnPercentage: { type: Number, default: 0 }, // 수익률 (%)
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // 리스크 지표
  riskMetrics: {
    volatility: { type: Number }, // 변동성
    sharpeRatio: { type: Number }, // 샤프비율
    beta: { type: Number }, // 베타
    maxDrawdown: { type: Number } // 최대낙폭
  },
  
  // 리밸런싱 정보
  rebalancing: {
    lastRebalanceDate: { type: Date },
    nextRebalanceDate: { type: Date },
    rebalanceFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi-annual', 'annual'],
      default: 'quarterly'
    },
    autoRebalance: { type: Boolean, default: false }
  },
  
  // 배당/분배금 정보
  distributions: [{
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ['dividend', 'interest', 'capital-gain'],
      required: true 
    },
    reinvested: { type: Boolean, default: false }
  }],
  
  // 거래 이력
  transactions: [{
    date: { type: Date, required: true },
    type: { 
      type: String, 
      enum: ['buy', 'sell', 'dividend', 'split', 'merger'],
      required: true 
    },
    assetName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    notes: { type: String }
  }],
  
  // 상담사 검토
  advisorReview: {
    lastReviewDate: { type: Date },
    rating: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'needs-attention'],
      default: 'good'
    },
    notes: { type: String },
    recommendations: [String]
  },
  
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// 인덱스 설정
investmentPortfolioSchema.index({ client: 1, isActive: 1 });
investmentPortfolioSchema.index({ financialAdvisor: 1, isActive: 1 });

// 가상 필드들
investmentPortfolioSchema.virtual('totalAllocation').get(function() {
  return this.holdings.reduce((sum, holding) => sum + holding.allocation, 0);
});

investmentPortfolioSchema.virtual('unrealizedGainLoss').get(function() {
  return this.holdings.reduce((sum, holding) => {
    return sum + ((holding.currentPrice - holding.purchasePrice) * holding.quantity);
  }, 0);
});

// 성과 업데이트 메서드
investmentPortfolioSchema.methods.updatePerformance = function() {
  const totalInvested = this.holdings.reduce((sum, holding) => {
    return sum + (holding.purchasePrice * holding.quantity);
  }, 0);
  
  const currentValue = this.holdings.reduce((sum, holding) => {
    return sum + (holding.currentPrice * holding.quantity);
  }, 0);
  
  const totalReturn = currentValue - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  
  this.performance = {
    totalInvested,
    currentValue,
    totalReturn,
    returnPercentage,
    lastUpdated: new Date()
  };
  
  return this.save();
};

module.exports = mongoose.model('InvestmentPortfolio', investmentPortfolioSchema);