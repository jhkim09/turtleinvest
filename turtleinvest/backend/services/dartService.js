const axios = require('axios');

class DartService {
  
  constructor() {
    this.baseURL = 'https://opendart.fss.or.kr/api';
    this.apiKey = process.env.DART_API_KEY || '';
    this.cache = new Map(); // 캐시로 API 호출 최소화
    this.rateLimitDelay = 200; // API 호출 간격 (밀리초)
    
    // 전체 기업코드 캐시 (한 번만 로드하고 재사용)
    this.allCorpCodes = null;
    this.lastCorpCodeUpdate = null;
    this.corpCodeCacheExpiry = 24 * 60 * 60 * 1000; // 24시간 캐시
    this.isLoading = false; // 동시 로딩 방지
  }
  
  // 전체 기업코드 데이터 로드 (24시간 캐시)
  async loadAllCorpCodes() {
    try {
      // 캐시가 유효한지 확인
      const now = Date.now();
      if (this.allCorpCodes && this.lastCorpCodeUpdate && 
          (now - this.lastCorpCodeUpdate) < this.corpCodeCacheExpiry) {
        return this.allCorpCodes;
      }
      
      // 동시 로딩 방지 (여러 종목이 동시에 요청할 때)
      if (this.isLoading) {
        console.log(`⏳ 다른 요청이 이미 기업코드 로딩 중... 대기`);
        // 로딩 완료까지 대기
        while (this.isLoading) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        // 로딩 완료 후 캐시 반환
        return this.allCorpCodes;
      }
      
      this.isLoading = true;
      console.log(`📋 DART API: 전체 기업코드 데이터 로딩 중...`);
      
      const response = await axios.get(`${this.baseURL}/corpCode.xml`, {
        params: {
          crtfc_key: this.apiKey
        },
        responseType: 'arraybuffer'
      });
      
      if (!response.data) {
        throw new Error('DART API 응답 없음');
      }
      
      let xmlText;
      
      // ZIP 파일 처리
      try {
        const JSZip = require('jszip');
        const zip = new JSZip();
        const contents = await zip.loadAsync(response.data);
        const xmlFile = Object.keys(contents.files)[0];
        if (xmlFile) {
          xmlText = await contents.files[xmlFile].async('text');
          console.log(`📦 ZIP에서 XML 추출: ${xmlFile}, 크기: ${xmlText.length}`);
        } else {
          throw new Error('ZIP 파일 내 XML 없음');
        }
      } catch (zipError) {
        xmlText = response.data.toString();
        console.log(`📄 일반 텍스트로 처리, 크기: ${xmlText.length}`);
      }
      
      // XML 실제 구조 분석 (처음 2000자)
      console.log(`🔍 XML 구조 샘플:\n${xmlText.substring(0, 2000)}`);
      
      // 전체 기업코드 파싱해서 Map으로 저장
      const corpCodeMap = new Map();
      
      // 특정 종목코드 찾기 - 모든 매칭을 찾아서 올바른 것 선택
      let stockMatches = [];
      const regex = /<list>[\s\S]*?<corp_code>([^<]+)<\/corp_code>[\s\S]*?<corp_name>([^<]+)<\/corp_name>[\s\S]*?<stock_code>\s*(\d{6})\s*<\/stock_code>[\s\S]*?<\/list>/g;
      
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        const [, corpCode, corpName, foundStockCode] = match;
        stockMatches.push({
          stockCode: foundStockCode.trim(),
          corpCode: corpCode.trim(),
          corpName: corpName.trim()
        });
      }
      
      console.log(`🔍 XML에서 총 ${stockMatches.length}개 상장기업 발견`);
      
      // 모든 종목 데이터를 Map에 저장 (실제 상장기업 우선 선택)
      for (const stock of stockMatches) {
        // 이미 해당 종목코드가 있는 경우, 더 적합한 회사명인지 확인
        if (corpCodeMap.has(stock.stockCode)) {
          const existing = corpCodeMap.get(stock.stockCode);
          
          // 부동산투자회사, 유동화전문회사 등은 제외하고 실제 기업 우선
          const skipKeywords = ['유동화전문', '부동산투자회사', '위탁관리', '사모투자', '새마을금고'];
          const isExistingBetter = !skipKeywords.some(keyword => existing.corpName.includes(keyword));
          const isCurrentWorse = skipKeywords.some(keyword => stock.corpName.includes(keyword));
          
          if (isExistingBetter && isCurrentWorse) {
            // 기존이 더 좋으므로 건너뛰기
            continue;
          }
        }
        
        corpCodeMap.set(stock.stockCode, {
          corpCode: stock.corpCode,
          corpName: stock.corpName
        });
      }
      
      console.log(`✅ 총 ${stockMatches.length}개 기업코드 로딩 완료`);
      
      // 처음 5개 샘플 출력
      const samples = stockMatches.slice(0, 5);
      samples.forEach(stock => {
        console.log(`📝 샘플: ${stock.stockCode} → ${stock.corpCode}, ${stock.corpName}`);
      });
      
      // 메모리 정리 (xmlText는 매우 큰 문자열이므로 명시적으로 해제)
      xmlText = null;
      
      this.allCorpCodes = corpCodeMap;
      this.lastCorpCodeUpdate = now;
      
      // 가비지 컬렉션 힌트
      if (global.gc) {
        global.gc();
      }
      
      return this.allCorpCodes;
      
    } catch (error) {
      console.error(`❌ 전체 기업코드 로딩 실패:`, error.message);
      return null;
    } finally {
      this.isLoading = false; // 로딩 플래그 해제
    }
  }
  
  // 기업 고유번호 조회 (종목코드 → 기업코드 변환)
  async getCorpCode(stockCode) {
    try {
      const cacheKey = `corp_${stockCode}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      // 전체 기업코드 데이터 확인
      const allCorpCodes = await this.loadAllCorpCodes();
      if (!allCorpCodes) {
        console.log(`❌ ${stockCode} 전체 기업코드 데이터 로딩 실패`);
        return null;
      }
      
      const result = allCorpCodes.get(stockCode);
      if (result) {
        console.log(`✅ ${stockCode} → ${result.corpCode}, ${result.corpName}`);
        this.cache.set(cacheKey, result);
        return result;
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ 기업코드 조회 실패 (${stockCode}):`, error.message);
      if (error.response) {
        console.error(`응답 상태: ${error.response.status}, 데이터: ${error.response.data}`);
      }
      return null;
    }
  }
  
  // 상장주식수 조회 (DART API - 발행주식수 정보)
  async getSharesOutstanding(stockCode, year = 2024) {
    try {
      const corpInfo = await this.getCorpCode(stockCode);
      if (!corpInfo) {
        throw new Error('기업코드를 찾을 수 없습니다');
      }
      
      await this.delay(this.rateLimitDelay);
      
      // 주식발행현황 API 사용
      const response = await axios.get(`${this.baseURL}/stockSttus.json`, {
        params: {
          crtfc_key: this.apiKey,
          corp_code: corpInfo.corpCode,
          bsns_year: year.toString(),
          reprt_code: '11011' // 사업보고서
        }
      });
      
      if (response.data.status === '000' && response.data.list?.length > 0) {
        // 보통주 발행주식수 찾기
        const stockData = response.data.list.find(item => 
          item.se && (item.se.includes('보통주') || item.se.includes('주식수'))
        );
        
        if (stockData && stockData.istc_totqy) {
          const shares = parseInt(stockData.istc_totqy.replace(/[,]/g, ''));
          console.log(`📈 ${stockCode} 상장주식수: ${shares.toLocaleString()}주`);
          return shares;
        }
      }
      
      console.log(`⚠️ ${stockCode} 상장주식수 정보 없음`);
      return null;
      
    } catch (error) {
      console.error(`상장주식수 조회 실패 (${stockCode}):`, error.message);
      return null;
    }
  }
  
  // 재무제표 조회 (단일회사 전체 재무제표)
  async getFinancialStatement(stockCode, year = 2024, reportType = '11011') {
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
      
      // 매출액 (수익인식기준) - DART는 백만원 단위
      if (accountName.includes('수익(매출액)') || accountName.includes('매출액')) {
        result.revenue = amount / 100; // 백만원 → 억원 변환
      }
      // 당기순이익 - DART는 백만원 단위
      else if (accountName.includes('당기순이익') || accountName.includes('순이익')) {
        result.netIncome = amount / 100; // 백만원 → 억원 변환
      }
      // 영업이익 - DART는 백만원 단위
      else if (accountName.includes('영업이익')) {
        result.operatingIncome = amount / 100; // 백만원 → 억원 변환
      }
      // 총자산 - DART는 백만원 단위
      else if (accountName.includes('자산총계') || accountName.includes('총자산')) {
        result.totalAssets = amount / 100; // 백만원 → 억원 변환
      }
      // 자본총계 - DART는 백만원 단위
      else if (accountName.includes('자본총계') || accountName.includes('총자본')) {
        result.totalEquity = amount / 100; // 백만원 → 억원 변환
      }
    });
    
    return result;
  }
  
  // 3개년 재무데이터 조회
  async getThreeYearFinancials(stockCode) {
    try {
      const currentYear = 2024; // 2024년 기준
      const years = [2022, 2023, 2024]; // 3개년
      
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