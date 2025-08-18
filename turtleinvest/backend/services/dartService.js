const axios = require('axios');

class DartService {
  
  constructor() {
    this.baseURL = 'https://opendart.fss.or.kr/api';
    this.apiKey = process.env.DART_API_KEY || '';
    this.cache = new Map(); // 캐시로 API 호출 최소화
    this.rateLimitDelay = 200; // API 호출 간격 (밀리초)
  }
  
  // 기업 고유번호 조회 (종목코드 → 기업코드 변환)
  async getCorpCode(stockCode) {
    try {
      const cacheKey = `corp_${stockCode}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      const response = await axios.get(`${this.baseURL}/corpCode.xml`, {
        params: {
          crtfc_key: this.apiKey
        }
      });
      
      // XML 파싱하여 기업코드 찾기 (간단한 검색)
      const xmlText = response.data;
      const regex = new RegExp(`<stock_code>${stockCode}</stock_code>\\s*<corp_name>([^<]+)</corp_name>\\s*<corp_code>([^<]+)</corp_code>`, 'i');
      const match = xmlText.match(regex);
      
      if (match) {
        const result = {
          corpCode: match[2].trim(),
          corpName: match[1].trim()
        };
        this.cache.set(cacheKey, result);
        return result;
      }
      
      return null;
      
    } catch (error) {
      console.error(`기업코드 조회 실패 (${stockCode}):`, error.message);
      return null;
    }
  }
  
  // 재무제표 조회 (단일회사 전체 재무제표)
  async getFinancialStatement(stockCode, year = 2023, reportType = '11011') {
    try {
      const cacheKey = `fs_${stockCode}_${year}_${reportType}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      // 기업 고유번호 조회
      const corpInfo = await this.getCorpCode(stockCode);
      if (!corpInfo) {
        throw new Error('기업코드를 찾을 수 없습니다');
      }
      
      await this.delay(this.rateLimitDelay); // Rate limit 준수
      
      const response = await axios.get(`${this.baseURL}/fnlttSinglAcnt.json`, {
        params: {
          crtfc_key: this.apiKey,
          corp_code: corpInfo.corpCode,
          bsns_year: year.toString(),
          reprt_code: reportType, // 11011: 사업보고서
          fs_div: 'CFS' // CFS: 연결재무제표, OFS: 별도재무제표
        }
      });
      
      if (response.data.status === '000') {
        const result = this.parseFinancialData(response.data.list);
        this.cache.set(cacheKey, result);
        return result;
      } else {
        throw new Error(`DART API 오류: ${response.data.message}`);
      }
      
    } catch (error) {
      console.error(`재무제표 조회 실패 (${stockCode}):`, error.message);
      return null;
    }
  }
  
  // 재무데이터 파싱
  parseFinancialData(dataList) {
    const result = {
      revenue: 0,
      netIncome: 0,
      operatingIncome: 0,
      totalAssets: 0,
      totalEquity: 0
    };
    
    dataList.forEach(item => {
      const accountName = item.account_nm;
      const amount = parseInt(item.thstrm_amount?.replace(/,/g, '') || '0');
      
      // 매출액 (수익인식기준)
      if (accountName.includes('수익(매출액)') || accountName.includes('매출액')) {
        result.revenue = amount;
      }
      // 당기순이익
      else if (accountName.includes('당기순이익') || accountName.includes('순이익')) {
        result.netIncome = amount;
      }
      // 영업이익
      else if (accountName.includes('영업이익')) {
        result.operatingIncome = amount;
      }
      // 총자산
      else if (accountName.includes('자산총계') || accountName.includes('총자산')) {
        result.totalAssets = amount;
      }
      // 자본총계
      else if (accountName.includes('자본총계') || accountName.includes('총자본')) {
        result.totalEquity = amount;
      }
    });
    
    return result;
  }
  
  // 3개년 재무데이터 조회
  async getThreeYearFinancials(stockCode) {
    try {
      const currentYear = new Date().getFullYear() - 1; // 전년도부터
      const years = [currentYear - 2, currentYear - 1, currentYear]; // 3개년
      
      const financials = [];
      
      for (const year of years) {
        const data = await this.getFinancialStatement(stockCode, year);
        if (data) {
          financials.push({
            year: year,
            revenue: data.revenue,
            netIncome: data.netIncome,
            operatingIncome: data.operatingIncome
          });
        }
        await this.delay(this.rateLimitDelay); // Rate limit 준수
      }
      
      return financials;
      
    } catch (error) {
      console.error(`3개년 재무데이터 조회 실패 (${stockCode}):`, error.message);
      return [];
    }
  }
  
  // 성장률 계산
  calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const years = values.length - 1;
    
    if (startValue <= 0) return 0;
    
    const growthRate = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    return Math.round(growthRate * 100) / 100;
  }
  
  // 슈퍼스톡스 조건 확인을 위한 종합 분석
  async analyzeStockFinancials(stockCode) {
    try {
      console.log(`📊 DART API로 ${stockCode} 재무분석 시작...`);
      
      const financials = await this.getThreeYearFinancials(stockCode);
      
      if (financials.length < 3) {
        console.log(`⚠️ ${stockCode}: 재무데이터 부족 (${financials.length}년)`);
        return null;
      }
      
      // 매출 및 순이익 성장률 계산
      const revenues = financials.map(f => f.revenue);
      const netIncomes = financials.map(f => f.netIncome);
      
      const revenueGrowth = this.calculateGrowthRate(revenues);
      const netIncomeGrowth = this.calculateGrowthRate(netIncomes);
      
      console.log(`✅ ${stockCode}: 매출성장률 ${revenueGrowth}%, 순이익성장률 ${netIncomeGrowth}%`);
      
      return {
        stockCode: stockCode,
        latestYear: financials[financials.length - 1].year,
        revenue: financials[financials.length - 1].revenue,
        netIncome: financials[financials.length - 1].netIncome,
        revenueGrowth3Y: revenueGrowth,
        netIncomeGrowth3Y: netIncomeGrowth,
        revenueHistory: revenues,
        netIncomeHistory: netIncomes,
        financials: financials
      };
      
    } catch (error) {
      console.error(`DART 재무분석 실패 (${stockCode}):`, error.message);
      return null;
    }
  }
  
  // Rate limit을 위한 지연 함수
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // API 키 설정
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }
  
  // 캐시 초기화
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new DartService();