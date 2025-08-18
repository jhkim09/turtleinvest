const axios = require('axios');

class DartService {
  
  constructor() {
    this.baseURL = 'https://opendart.fss.or.kr/api';
    this.apiKey = process.env.DART_API_KEY || '';
    this.cache = new Map(); // 캐시로 API 호출 최소화
    this.rateLimitDelay = 200; // API 호출 간격 (밀리초)
    
    // 주요 종목 기업코드 직접 매핑 (DART API 우회용)
    this.corpCodeMap = {
      '005930': '00126380', // 삼성전자
      '000660': '00164779', // SK하이닉스  
      '035420': '00781427', // NAVER
      '005380': '00164742', // 현대차
      '012330': '00164779', // 현대모비스
      '000270': '00164485', // 기아
      '105560': '00188992', // KB금융
      '055550': '00188807', // 신한지주
      '035720': '00826799', // 카카오
      '051910': '00164779', // LG화학
      '032350': '00164485'  // 롯데관광개발
    };
  }
  
  // 기업 고유번호 조회 (종목코드 → 기업코드 변환)
  async getCorpCode(stockCode) {
    try {
      const cacheKey = `corp_${stockCode}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      // 먼저 하드코딩된 매핑 확인
      if (this.corpCodeMap[stockCode]) {
        const result = {
          corpCode: this.corpCodeMap[stockCode],
          corpName: this.getStockName(stockCode)
        };
        console.log(`✅ ${stockCode} 하드코딩 매핑: ${result.corpCode}, ${result.corpName}`);
        this.cache.set(cacheKey, result);
        return result;
      }
      
      console.log(`🔍 DART API: ${stockCode} 기업코드 조회 중...`);
      
      const response = await axios.get(`${this.baseURL}/corpCode.xml`, {
        params: {
          crtfc_key: this.apiKey
        },
        responseType: 'arraybuffer' // XML 파일이 압축되어 있을 수 있음
      });
      
      if (!response.data) {
        console.error(`❌ DART API 응답 없음 (${stockCode})`);
        return null;
      }
      
      let xmlText;
      
      // 응답이 압축된 ZIP 파일인지 확인
      try {
        const JSZip = require('jszip');
        const zip = new JSZip();
        const contents = await zip.loadAsync(response.data);
        
        // ZIP 파일 내의 XML 파일 찾기
        const xmlFile = Object.keys(contents.files)[0];
        if (xmlFile) {
          xmlText = await contents.files[xmlFile].async('text');
          console.log(`📦 ZIP 파일에서 XML 추출 완료: ${xmlFile}`);
        } else {
          throw new Error('ZIP 파일 내 XML을 찾을 수 없음');
        }
      } catch (zipError) {
        // ZIP이 아닌 경우 일반 텍스트로 처리
        xmlText = response.data.toString();
        console.log(`📄 일반 텍스트로 XML 처리`);
      }
      
      // 응답 타입 확인
      console.log(`📄 XML 길이: ${xmlText.length}`);
      
      // XML 구조 확인 (처음 1000자만)
      console.log(`🔍 XML 샘플: ${xmlText.substring(0, 1000)}...`);
      
      // 여러 패턴으로 시도
      const patterns = [
        // 기본 패턴
        new RegExp(`<stock_code>${stockCode}</stock_code>\\s*<corp_name>([^<]+)</corp_name>\\s*<corp_code>([^<]+)</corp_code>`, 'i'),
        // 순서가 다른 경우
        new RegExp(`<corp_code>([^<]+)</corp_code>\\s*<corp_name>([^<]+)</corp_name>\\s*<stock_code>${stockCode}</stock_code>`, 'i'),
        // 더 유연한 패턴
        new RegExp(`<list>.*?<stock_code>${stockCode}</stock_code>.*?<corp_name>([^<]+)</corp_name>.*?<corp_code>([^<]+)</corp_code>.*?</list>`, 'is')
      ];
      
      let match = null;
      for (let i = 0; i < patterns.length; i++) {
        match = xmlText.match(patterns[i]);
        if (match) {
          console.log(`✅ 패턴 ${i + 1}로 매칭 성공`);
          break;
        }
      }
      
      if (match) {
        // 패턴에 따라 결과 순서가 다를 수 있음
        let corpCode, corpName;
        if (match.length >= 3) {
          // 대부분의 패턴: [전체매칭, 회사명, 기업코드]
          corpName = match[1].trim();
          corpCode = match[2].trim();
        }
        
        const result = {
          corpCode: corpCode,
          corpName: corpName
        };
        console.log(`✅ ${stockCode} → 기업코드: ${result.corpCode}, 회사명: ${result.corpName}`);
        this.cache.set(cacheKey, result);
        return result;
      }
      
      console.log(`❌ ${stockCode} 기업코드를 XML에서 찾을 수 없음`);
      return null;
      
    } catch (error) {
      console.error(`❌ 기업코드 조회 실패 (${stockCode}):`, error.message);
      if (error.response) {
        console.error(`응답 상태: ${error.response.status}, 데이터: ${error.response.data}`);
      }
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
  
  // 종목명 반환 (기본 매핑)
  getStockName(stockCode) {
    const stockNames = {
      '005930': '삼성전자',
      '000660': 'SK하이닉스',  
      '035420': 'NAVER',
      '005380': '현대차',
      '012330': '현대모비스',
      '000270': '기아',
      '105560': 'KB금융',
      '055550': '신한지주',
      '035720': '카카오',
      '051910': 'LG화학',
      '032350': '롯데관광개발'
    };
    return stockNames[stockCode] || `종목${stockCode}`;
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