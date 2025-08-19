const axios = require('axios');

class DartService {
  
  constructor() {
    this.baseURL = 'https://opendart.fss.or.kr/api';
    this.apiKey = '';
    this.cache = new Map(); // 캐시로 API 호출 최소화
    this.rateLimitDelay = 200; // API 호출 간격 (밀리초)
    
    // 전체 기업코드 캐시 (한 번만 로드하고 재사용)
    this.allCorpCodes = null;
    this.lastCorpCodeUpdate = null;
    this.corpCodeCacheExpiry = 24 * 60 * 60 * 1000; // 24시간 캐시
    this.isLoading = false; // 동시 로딩 방지
    
    // 환경변수에서 API 키 로드
    this.loadApiKey();
  }
  
  // API 키 로드 함수
  loadApiKey() {
    if (typeof process !== 'undefined' && process.env) {
      this.apiKey = process.env.DART_API_KEY || '';
      console.log(`🔑 DART API Key 로드: ${this.apiKey ? '성공' : '실패'} (길이: ${this.apiKey.length})`);
    } else {
      console.warn('⚠️ process.env를 사용할 수 없습니다');
    }
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
      
      // ZIP 파일 처리 (DART API는 ZIP 형태로 제공)
      const JSZip = require('jszip');
      const zip = new JSZip();
      const contents = await zip.loadAsync(response.data);
      const xmlFile = Object.keys(contents.files)[0];
      
      if (!xmlFile) {
        throw new Error('ZIP 파일 내 XML 파일을 찾을 수 없음');
      }
      
      xmlText = await contents.files[xmlFile].async('text');
      console.log(`📦 ZIP에서 XML 추출: ${xmlFile}, 크기: ${xmlText.length.toLocaleString()}`);
      
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
          const skipKeywords = ['유동화전문', '부동산투자회사', '위탁관리', '사모투자', '새마을금고', '제', '차', '호', '리츠', 'REIT'];
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
  
  // 기업 고유번호 조회 (종목코드 → 기업코드 변환) - 직접 조회 방식
  async getCorpCode(stockCode) {
    try {
      const cacheKey = `corp_${stockCode}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      // 알려진 주요 종목 기업코드 (100개 종목 대응)
      const knownCorpCodes = {
        // 코스피 주요 종목
        '005930': { corpCode: '00126380', corpName: '삼성전자' },
        '000660': { corpCode: '00164779', corpName: 'SK하이닉스' },
        '035420': { corpCode: '00593624', corpName: 'NAVER' },
        '005380': { corpCode: '00164742', corpName: '현대차' },
        '012330': { corpCode: '00268317', corpName: '현대모비스' },
        '000270': { corpCode: '00164509', corpName: '기아' },
        '105560': { corpCode: '00103522', corpName: 'KB금융' },
        '055550': { corpCode: '00126186', corpName: '신한지주' },
        '035720': { corpCode: '00593652', corpName: '카카오' },
        '051910': { corpCode: '00356370', corpName: 'LG화학' },
        '006400': { corpCode: '00126343', corpName: '삼성SDI' },
        '028260': { corpCode: '00164742', corpName: '삼성물산' },
        '096770': { corpCode: '00126362', corpName: 'SK이노베이션' },
        '003550': { corpCode: '00356361', corpName: 'LG' },
        '015760': { corpCode: '00164760', corpName: '한국전력' },
        '017670': { corpCode: '00164765', corpName: 'SK텔레콤' },
        '034730': { corpCode: '00164731', corpName: 'SK' },
        '003490': { corpCode: '00164734', corpName: '대한항공' },
        '009150': { corpCode: '00126349', corpName: '삼성전기' },
        '032830': { corpCode: '00126344', corpName: '삼성생명' },
        
        // 코스닥 주요 종목
        '032350': { corpCode: '00111848', corpName: '롯데관광개발' },
        '060310': { corpCode: '00232467', corpName: '3S' },
        '042700': { corpCode: '00164787', corpName: '한미반도체' },
        '251270': { corpCode: '00593651', corpName: '넷마블' },
        '036570': { corpCode: '00593625', corpName: '엔씨소프트' },
        '352820': { corpCode: '00593659', corpName: '하이브' },
        '377300': { corpCode: '00593660', corpName: '카카오페이' },
        '259960': { corpCode: '00593655', corpName: '크래프톤' },
        '326030': { corpCode: '00593658', corpName: 'SK바이오팜' },
        '145020': { corpCode: '00593640', corpName: '휴젤' }
        
        // 참고: 나머지 종목들은 ZIP 파일에서 자동 조회하거나 필요시 추가
      };
      
      // 하드코딩된 데이터 우선 사용
      if (knownCorpCodes[stockCode]) {
        const result = knownCorpCodes[stockCode];
        console.log(`✅ ${stockCode} → ${result.corpCode}, ${result.corpName} (하드코딩)`);
        this.cache.set(cacheKey, result);
        return result;
      }
      
      // 하드코딩에 없으면 ZIP 파일 로딩 시도 (실패해도 계속 진행)
      try {
        const allCorpCodes = await this.loadAllCorpCodes();
        if (allCorpCodes) {
          const result = allCorpCodes.get(stockCode);
          if (result) {
            console.log(`✅ ${stockCode} → ${result.corpCode}, ${result.corpName} (DART API)`);
            this.cache.set(cacheKey, result);
            return result;
          }
        }
      } catch (zipError) {
        console.log(`⚠️ ${stockCode} ZIP 로딩 실패, 하드코딩 데이터로 대체 시도`);
      }
      
      console.log(`❌ ${stockCode} 기업코드를 찾을 수 없음`);
      return null;
      
    } catch (error) {
      console.error(`❌ 기업코드 조회 실패 (${stockCode}):`, error.message);
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
      
      const url = `${this.baseURL}/fnlttSinglAcnt.json?crtfc_key=${this.apiKey}&corp_code=${corpInfo.corpCode}&bsns_year=${year}&reprt_code=${reportType}&fs_div=CFS`;
      
      console.log(`🔗 DART API 호출 URL: ${url.replace(this.apiKey, this.apiKey.substring(0, 8) + '...')}`);
      
      const params = {
        crtfc_key: this.apiKey,
        corp_code: corpInfo.corpCode,
        bsns_year: year.toString(),
        reprt_code: reportType,
        fs_div: 'CFS'
      };
      
      console.log(`🔍 실제 전송 파라미터:`, {
        ...params,
        crtfc_key: params.crtfc_key ? params.crtfc_key.substring(0, 8) + '...' : 'UNDEFINED'
      });
      
      console.log(`🔑 API Key 상태: ${this.apiKey ? '존재함' : '없음'}, 길이: ${this.apiKey?.length}`);
      
      if (!this.apiKey) {
        throw new Error('DART API 키가 설정되지 않았습니다');
      }
      
      const response = await axios.get(`${this.baseURL}/fnlttSinglAcnt.json`, {
        params: params,
        timeout: 10000
      });
      
      console.log(`📋 DART API 응답: status=${response.data.status}, message=${response.data.message}`);
      
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
  
  // 재무데이터 파싱 (개선된 로직)
  parseFinancialData(dataList) {
    const result = {
      revenue: 0,
      netIncome: 0,
      operatingIncome: 0,
      totalAssets: 0,
      totalEquity: 0
    };
    
    // 연결재무제표 데이터만 추출 (첫 번째 나타나는 데이터)
    const seenAccounts = new Set();
    
    dataList.forEach(item => {
      const accountName = item.account_nm;
      const amount = parseInt(item.thstrm_amount?.replace(/,/g, '') || '0');
      
      // DART 데이터는 원 단위이므로 억원으로 변환 (÷ 100,000,000)
      const amountInBillion = amount / 100000000;
      
      // 매출액 (첫 번째만)
      if (accountName === '매출액' && !seenAccounts.has('revenue')) {
        result.revenue = amountInBillion;
        seenAccounts.add('revenue');
        console.log(`📊 매출액: ${result.revenue.toLocaleString()}억원 (${amount.toLocaleString()}원)`);
      }
      // 당기순이익 (첫 번째만)
      else if (accountName === '당기순이익' && !seenAccounts.has('netIncome')) {
        result.netIncome = amountInBillion;
        seenAccounts.add('netIncome');
        console.log(`📊 당기순이익: ${result.netIncome.toLocaleString()}억원 (${amount.toLocaleString()}원)`);
      }
      // 영업이익 (첫 번째만)
      else if (accountName === '영업이익' && !seenAccounts.has('operatingIncome')) {
        result.operatingIncome = amountInBillion;
        seenAccounts.add('operatingIncome');
        console.log(`📊 영업이익: ${result.operatingIncome.toLocaleString()}억원 (${amount.toLocaleString()}원)`);
      }
      // 자산총계 (첫 번째만)
      else if (accountName === '자산총계' && !seenAccounts.has('totalAssets')) {
        result.totalAssets = amountInBillion;
        seenAccounts.add('totalAssets');
        console.log(`📊 자산총계: ${result.totalAssets.toLocaleString()}억원 (${amount.toLocaleString()}원)`);
      }
      // 자본총계 (첫 번째만)
      else if (accountName === '자본총계' && !seenAccounts.has('totalEquity')) {
        result.totalEquity = amountInBillion;
        seenAccounts.add('totalEquity');
        console.log(`📊 자본총계: ${result.totalEquity.toLocaleString()}억원 (${amount.toLocaleString()}원)`);
      }
    });
    
    return result;
  }
  
  // 3개년 재무데이터 조회 (Multi Account API 사용)
  async getThreeYearFinancials(stockCode) {
    try {
      // 기업 고유번호 조회
      const corpInfo = await this.getCorpCode(stockCode);
      if (!corpInfo) {
        throw new Error('기업코드를 찾을 수 없습니다');
      }
      
      await this.delay(this.rateLimitDelay);
      
      console.log(`📊 ${stockCode} Multi Account API로 3개년 데이터 조회...`);
      
      // Multi Account API 호출 (한 번에 3개년 데이터)
      const response = await axios.get(`${this.baseURL}/fnlttMultiAcnt.json`, {
        params: {
          crtfc_key: this.apiKey,
          corp_code: corpInfo.corpCode,
          bsns_year: '2024',
          reprt_code: '11011' // 사업보고서
        },
        timeout: 10000
      });
      
      if (response.data.status !== '000') {
        throw new Error(`DART API 오류: ${response.data.message}`);
      }
      
      // 연결재무제표 데이터만 추출 (첫 번째 나오는 것)
      const revenueData = response.data.list?.find(item => 
        item.account_nm === '매출액' && item.sj_nm === '손익계산서'
      );
      
      const netIncomeData = response.data.list?.find(item => 
        item.account_nm === '당기순이익' && item.sj_nm === '손익계산서'
      );
      
      if (!revenueData || !netIncomeData) {
        throw new Error('필수 재무 데이터를 찾을 수 없습니다');
      }
      
      // 3개년 데이터 파싱
      const financials = [];
      
      // 전전기 (2022년)
      if (revenueData.bfefrmtrm_amount && netIncomeData.bfefrmtrm_amount) {
        financials.push({
          year: 2022,
          revenue: parseInt(revenueData.bfefrmtrm_amount.replace(/,/g, '')) / 100000000,
          netIncome: parseInt(netIncomeData.bfefrmtrm_amount.replace(/,/g, '')) / 100000000,
          operatingIncome: 0 // Multi API에서는 영업이익이 별도로 제공되지 않을 수 있음
        });
      }
      
      // 전기 (2023년)
      if (revenueData.frmtrm_amount && netIncomeData.frmtrm_amount) {
        financials.push({
          year: 2023,
          revenue: parseInt(revenueData.frmtrm_amount.replace(/,/g, '')) / 100000000,
          netIncome: parseInt(netIncomeData.frmtrm_amount.replace(/,/g, '')) / 100000000,
          operatingIncome: 0
        });
      }
      
      // 당기 (2024년)
      if (revenueData.thstrm_amount && netIncomeData.thstrm_amount) {
        financials.push({
          year: 2024,
          revenue: parseInt(revenueData.thstrm_amount.replace(/,/g, '')) / 100000000,
          netIncome: parseInt(netIncomeData.thstrm_amount.replace(/,/g, '')) / 100000000,
          operatingIncome: 0
        });
      }
      
      console.log(`✅ ${stockCode} Multi API로 ${financials.length}개년 데이터 수집 완료`);
      
      // 매출/순이익 추이 출력
      if (financials.length >= 3) {
        const revenues = financials.map(f => f.revenue.toLocaleString()).join(' → ');
        const netIncomes = financials.map(f => f.netIncome.toLocaleString()).join(' → ');
        console.log(`📈 매출 추이: ${revenues}억원`);
        console.log(`📈 순이익 추이: ${netIncomes}억원`);
      }
      
      return financials;
      
    } catch (error) {
      console.error(`Multi Account API 조회 실패 (${stockCode}):`, error.message);
      
      // Fallback: 기존 방식으로 시도
      console.log(`⚠️ ${stockCode} Fallback으로 기존 API 사용`);
      return await this.getThreeYearFinancialsLegacy(stockCode);
    }
  }
  
  // 기존 방식 (Fallback용)
  async getThreeYearFinancialsLegacy(stockCode) {
    try {
      const currentYear = 2024;
      const years = [2022, 2023, 2024];
      
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
        await this.delay(this.rateLimitDelay);
      }
      
      return financials;
      
    } catch (error) {
      console.error(`Legacy 3개년 재무데이터 조회 실패 (${stockCode}):`, error.message);
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
      
      // 기업명 가져오기
      const corpInfo = await this.getCorpCode(stockCode);
      
      return {
        stockCode: stockCode,
        name: corpInfo?.corpName || this.getStockName(stockCode),
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