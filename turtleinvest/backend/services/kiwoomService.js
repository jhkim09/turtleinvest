const axios = require('axios');

class KiwoomService {
  
  constructor() {
    this.isConnected = false;
    this.accountNumber = '';
    this.accessToken = '';
    this.baseURL = 'https://api.kiwoom.com'; // 실서버
    this.mockURL = 'https://mockapi.kiwoom.com'; // 모의서버
    this.useMock = false; // 실전 서버 사용
  }
  
  // OAuth 2.0 토큰 발급
  async authenticate(appKey, secretKey) {
    try {
      console.log('🔐 키움 API 인증 시작...');
      
      const url = `${this.useMock ? this.mockURL : this.baseURL}/oauth2/token`;
      
      // JSON 형태로 데이터 준비
      const data = {
        grant_type: 'client_credentials',
        appkey: appKey,
        secretkey: secretKey
      };
      
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      });
      
      if (response.data.token) {
        this.accessToken = response.data.token;
        this.isConnected = true;
        console.log('✅ 키움 API 인증 성공');
        console.log('📅 토큰 만료:', response.data.expires_dt);
        return true;
      } else {
        console.log('📋 응답 데이터:', response.data);
        throw new Error('토큰 발급 실패');
      }
      
    } catch (error) {
      console.error('❌ 키움 API 인증 실패:', error.message);
      if (error.response) {
        console.error('📋 에러 응답:', error.response.status, error.response.data);
      }
      this.isConnected = false;
      
      // 인증 실패시 시뮬레이션 모드로 전환
      console.log('📊 시뮬레이션 모드로 전환');
      return false;
    }
  }
  
  // 키움 OpenAPI Plus 연결
  async connect(accountNumber, appKey, secretKey) {
    try {
      console.log('🔗 키움 API 연결 시도...');
      
      this.accountNumber = accountNumber;
      
      // 토큰 인증 시도
      const authSuccess = await this.authenticate(appKey, secretKey);
      
      if (authSuccess) {
        console.log('✅ 키움 API 연결 성공');
      } else {
        console.log('⚠️ 시뮬레이션 모드로 실행');
      }
      
      return authSuccess;
      
    } catch (error) {
      console.error('❌ 키움 API 연결 실패:', error);
      this.isConnected = false;
      return false;
    }
  }
  
  // 주식 현재가 조회
  async getCurrentPrice(symbol) {
    try {
      if (!this.isConnected) {
        return this.getSimulationPrice(symbol);
      }
      
      // 실제 키움 API 호출 - 주식현재가시세
      const url = `${this.useMock ? this.mockURL : this.baseURL}/uapi/domestic-stock/v1/quotations/inquire-price`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'appkey': process.env.KIWOOM_APP_KEY,
          'appsecret': process.env.KIWOOM_SECRET_KEY,
          'tr_id': 'FHKST01010100'
        },
        params: {
          'fid_cond_mrkt_div_code': 'J',
          'fid_input_iscd': symbol
        }
      });
      
      if (response.data.rt_cd === '0') {
        return parseInt(response.data.output.stck_prpr); // 주식현재가
      } else {
        throw new Error(`API 오류: ${response.data.msg1}`);
      }
      
    } catch (error) {
      console.error(`가격 조회 실패 (${symbol}):`, error);
      // 실패시 시뮬레이션 데이터 반환
      return this.getSimulationPrice(symbol);
    }
  }
  
  // 일봉 데이터 조회 (실제 데이터 우선, Yahoo Finance 백업)
  async getDailyData(symbol, days = 55) {
    try {
      // 1. Yahoo Finance에서 실제 일봉 데이터 시도
      const YahooFinanceService = require('./yahooFinanceService');
      const yahooData = await YahooFinanceService.getDailyChartData(symbol, days);
      
      if (yahooData && yahooData.length > 0) {
        console.log(`✅ Yahoo Finance: ${symbol} 실제 일봉 데이터 ${yahooData.length}개 조회`);
        return yahooData;
      }
      
      // 2. 키움 API 시도 (연결된 경우)
      if (this.isConnected) {
        console.log(`🔄 ${symbol} 키움 API 시도...`);
        
        const url = `${this.useMock ? this.mockURL : this.baseURL}/api/dostk/chart`;
        const today = new Date();
        const baseDate = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        const requestBody = {
          stk_cd: symbol,
          base_dt: baseDate,
          upd_stkpc_tp: '1'
        };
        
        const response = await axios.post(url, requestBody, {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'authorization': `Bearer ${this.accessToken}`,
            'cont-yn': 'N',
            'next-key': '',
            'api-id': 'ka10081'
          }
        });
        
        if (response.data && response.data.return_code === 0) {
          console.log(`✅ 키움 API: ${symbol} 일봉 데이터 조회 성공`);
          const chartData = response.data.chart_data || [];
          
          const dailyData = chartData.slice(0, days).map(item => ({
            date: item.dt,
            open: parseInt(item.op_pric || '0'),
            high: parseInt(item.hg_pric || '0'),
            low: parseInt(item.lw_pric || '0'),
            close: parseInt(item.cls_pric || '0'),
            volume: parseInt(item.tr_vol || '0')
          }));
          
          return dailyData.reverse();
        }
      }
      
      // 3. 모든 실제 데이터 실패시에만 시뮬레이션 사용
      console.log(`⚠️ ${symbol}: 실제 데이터 없음, 시뮬레이션 사용`);
      return this.getSimulationDailyData(symbol, days);
      
    } catch (error) {
      console.error(`일봉 데이터 조회 실패 (${symbol}):`, error.message);
      // 최종 백업: 시뮬레이션 데이터
      return this.getSimulationDailyData(symbol, days);
    }
  }
  
  // 계좌 잔고 조회
  async getAccountBalance() {
    try {
      if (!this.isConnected) {
        return {
          cash: 50000000, // 5천만원 시뮬레이션
          totalAsset: 50000000,
          positions: []
        };
      }
      
      // 실제 키움 API 호출 - 계좌평가잔고내역 (kt00018)
      const url = `${this.useMock ? this.mockURL : this.baseURL}/api/dostk/acnt`;
      
      const requestBody = {
        qry_tp: '1', // 조회구분 1:합산, 2:개별
        dmst_stex_tp: 'KRX' // 국내거래소구분 KRX:한국거래소,NXT:넥스트트레이드
      };
      
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'authorization': `Bearer ${this.accessToken}`,
          'cont-yn': 'N',
          'next-key': '',
          'api-id': 'kt00018'
        }
      });
      
      if (response.data && response.data.return_code === 0) {
        console.log('📋 키움 계좌 응답:', JSON.stringify(response.data, null, 2));
        
        const data = response.data;
        
        // 실제 키움 계좌 데이터 파싱
        const totalAsset = parseInt(data.prsm_dpst_aset_amt || '0'); // 추정예탁자산금액
        const totalEvaluation = parseInt(data.tot_evlt_amt || '0'); // 총평가금액  
        const totalPurchase = parseInt(data.tot_pur_amt || '0'); // 총매입금액
        const cash = totalAsset - totalEvaluation; // 현금 = 총자산 - 평가금액
        
        // 보유종목 정보
        const positions = (data.acnt_evlt_remn_indv_tot || []).map(item => ({
          symbol: item.stk_cd || '',
          name: item.stk_nm || '',
          quantity: parseInt(item.qty || '0'),
          avgPrice: parseInt(item.avg_pric || '0'),
          currentPrice: parseInt(item.prsnt_pric || '0'),
          unrealizedPL: parseInt(item.evlt_pl || '0'),
          totalValue: parseInt(item.evlt_amt || '0')
        })).filter(pos => pos.quantity > 0);
        
        console.log('✅ 실제 키움 계좌 조회 성공');
        console.log(`💰 추정예탁자산: ${totalAsset.toLocaleString()}원`);
        console.log(`💵 현금(추정): ${cash.toLocaleString()}원`);
        console.log(`📈 평가금액: ${totalEvaluation.toLocaleString()}원`);
        console.log(`📊 보유종목: ${positions.length}개`);
        
        return {
          cash: cash,
          totalAsset: totalAsset,
          stockValue: totalEvaluation,
          positions: positions
        };
      } else {
        console.log('📋 키움 계좌 응답:', JSON.stringify(response.data, null, 2));
        throw new Error(`API 오류: ${response.data?.return_msg || '알 수 없는 오류'}`);
      }
      
    } catch (error) {
      console.error('계좌 조회 실패:', error.message);
      if (error.response) {
        console.error('📋 에러 응답:', error.response.status, error.response.data);
      }
      
      // 실패시 시뮬레이션 데이터 반환
      return {
        cash: 50000000,
        totalAsset: 50000000,
        positions: []
      };
    }
  }
  
  // 시뮬레이션 현재가 (실제 API 연동 전까지 사용)
  getSimulationPrice(symbol) {
    const basePrices = {
      '005930': 72500,   // 삼성전자
      '000660': 185000,  // SK하이닉스  
      '035420': 195000,  // NAVER
      '005380': 238500,  // 현대차
      '012330': 250000   // 현대모비스
    };
    
    const basePrice = basePrices[symbol] || 100000;
    const randomChange = (Math.random() - 0.5) * 0.04; // ±2%
    return Math.round(basePrice * (1 + randomChange));
  }
  
  // 시뮬레이션 일봉 데이터 (터틀 신호 발생 가능하도록 개선)
  getSimulationDailyData(symbol, days) {
    const currentPrice = this.getSimulationPrice(symbol);
    const data = [];
    
    // 터틀 신호 생성을 위한 패턴 (30% 확률로 돌파 패턴 생성)
    const generateBreakout = Math.random() < 0.3;
    const breakoutDay = Math.floor(days * 0.7); // 70% 지점에서 돌파
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i)); // 오래된 날짜부터
      
      let dayPrice;
      
      if (generateBreakout && i >= breakoutDay) {
        // 돌파 패턴: 최근 20일 최고가 돌파
        const basePrice = currentPrice * 0.85; // 기준 가격
        const breakoutBoost = 1 + (i - breakoutDay) * 0.02; // 점진적 상승
        dayPrice = Math.round(basePrice * breakoutBoost);
      } else {
        // 일반적인 횡보/하락 패턴
        const trendFactor = 1 + (Math.random() - 0.6) * 0.02; // 약간 하락 편향
        dayPrice = Math.round(currentPrice * trendFactor * (0.95 + i * 0.001));
      }
      
      const volatility = 0.015 + Math.random() * 0.015; // 1.5-3% 변동성
      const high = Math.round(dayPrice * (1 + volatility));
      const low = Math.round(dayPrice * (1 - volatility));
      const open = low + Math.round((high - low) * Math.random());
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: open,
        high: high,
        low: low,
        close: dayPrice,
        volume: Math.round(500000 + Math.random() * 3000000)
      });
    }
    
    // 최신 가격을 현재가에 맞춤
    if (data.length > 0) {
      data[data.length - 1].close = currentPrice;
    }
    
    return data; // 이미 시간순 정렬됨
  }
  
  // 실제 키움 API 호출 함수 (나중에 구현)
  async callKiwoomAPI(endpoint, params) {
    // 키움 OpenAPI Plus 호출 로직
    // 현재는 시뮬레이션
    throw new Error('키움 API 실제 연동 준비중');
  }
  
  // 연결 상태 확인
  isConnectedToKiwoom() {
    return this.isConnected;
  }
}

module.exports = new KiwoomService();