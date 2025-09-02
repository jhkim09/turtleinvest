# 터틀투자 API 매핑 레퍼런스

이 문서는 각 API 엔드포인트가 어떤 함수와 서비스를 호출하는지 매핑 정보를 제공합니다.
매번 코드를 뒤지지 않고 빠르게 참조할 수 있도록 작성되었습니다.

## 📋 목차

- [터틀 신호 관련 API](#터틀-신호-관련-api)
- [종목명 관련 API](#종목명-관련-api)
- [슈퍼스톡 관련 API](#슈퍼스톡-관련-api)
- [키움 API 관련](#키움-api-관련)
- [재무데이터 관련 API](#재무데이터-관련-api)
- [포지션/거래 관련 API](#포지션거래-관련-api)
- [테스트 API](#테스트-api)

---

## 터틀 신호 관련 API

### `/api/signals/*`

| 엔드포인트 | 메소드 | 주요 함수 | 호출 서비스 | 설명 |
|-----------|-------|-----------|-------------|------|
| `/api/signals/latest` | GET | `Signal.find()` | MongoDB | 최신 터틀 신호 10개 조회 |
| `/api/signals/analysis-details` | GET | `TurtleAnalyzer.analyzeMarket()` | TurtleAnalyzer, KiwoomService | 전체 시장 분석 및 신호 생성 |
| `/api/signals/risk` | GET | `TurtleAnalyzer.analyzeMarket()` + 리스크 계산 | TurtleAnalyzer, PortfolioTracker | 신호 + 리스크 분석 |
| `/api/signals/portfolio-n-values` | GET | `KiwoomService.getAccountBalance()` + `TurtleAnalyzer.calculateATR()` | KiwoomService, TurtleAnalyzer | 보유종목 N값(ATR) 분석 |

### 주요 호출 체인

```
/api/signals/latest
└── Signal.find().sort({ createdAt: -1 }).limit(10)

/api/signals/analysis-details  
├── TurtleAnalyzer.analyzeMarket()
│   ├── TurtleAnalyzer.analyzeStock(symbol, name)
│   │   ├── TurtleAnalyzer.getPriceData() → KiwoomService.getDailyData()
│   │   ├── YahooFinanceService.get52WeekHighLow()
│   │   └── TurtleAnalyzer.calculateRecommendedAction()
│   └── StockName.getBulkStockNames()
├── SuperstocksAnalyzer.analyzeSuperstocks()
└── SlackMessageFormatter.formatIntegratedAnalysis()

/api/signals/portfolio-n-values
├── KiwoomService.getAccountBalance()
├── TurtleAnalyzer.getPriceData() (각 보유종목별)
├── TurtleAnalyzer.calculateATR()
└── SlackMessageFormatter.formatPortfolioNValues()
```

---

## 종목명 관련 API

### `/api/stock-names/*`

| 엔드포인트 | 메소드 | 주요 함수 | 호출 서비스 | 설명 |
|-----------|-------|-----------|-------------|------|
| `/api/stock-names/test/:stockCode` | GET | `StockNameCacheService.getStockName()` | StockNameCacheService → StockName | 개별 종목명 조회 |
| `/api/stock-names/stats` | GET | `StockName.aggregate()` | MongoDB | 종목명 DB 통계 |
| `/api/stock-names/update-from-krx` | POST | `KrxDataParser.parseKrxData()` | KrxDataParser, StockName | KRX 데이터로 종목명 업데이트 |

### 주요 호출 체인

```
/api/stock-names/test/:stockCode
└── StockNameCacheService.getStockName(stockCode)
    ├── correctedNames 매핑 체크 (009150→삼성전기, 196170→알테오젠, 042660→한화오션)
    ├── memoryCache.get() (메모리 캐시)
    ├── StockName.getStockName() (DB 조회)
    └── generateFallbackName() (fallback)

StockName.getStockName()
├── correctedNames 매핑 적용
└── this.findOne({ stockCode, isActive: true })

StockName.getBulkStockNames()
├── correctedNames 매핑 적용  
└── this.find({ stockCode: { $in: stockCodes }, isActive: true })
```

---

## 슈퍼스톡 관련 API

### `/api/superstocks/*`

| 엔드포인트 | 메소드 | 주요 함수 | 호출 서비스 | 설명 |
|-----------|-------|-----------|-------------|------|
| `/api/superstocks/cache-status` | GET | `FinancialData.aggregate()` | MongoDB | 슈퍼스톡 캐시 통계 |
| `/api/superstocks/stock/:stockCode` | GET | `SuperstocksAnalyzer.analyzeSingleStock()` | SuperstocksAnalyzer | 개별 종목 슈퍼스톡 분석 |

### 주요 호출 체인

```
/api/superstocks/stock/:stockCode  
└── SuperstocksAnalyzer.analyzeSingleStock(stockCode)
    ├── FinancialData.getLatestFinancialData(stockCode)
    ├── KiwoomService.getCurrentPrice(stockCode) (모의 가격)
    ├── 성장률 계산 (매출, 순이익)
    ├── PSR 계산
    └── 조건 만족 여부 판단
```

---

## 키움 API 관련

### `/api/kiwoom/*`

| 엔드포인트 | 메소드 | 주요 함수 | 호출 서비스 | 설명 |
|-----------|-------|-----------|-------------|------|
| `/api/kiwoom/price/:symbol` | GET | `KiwoomService.getCurrentPrice()` | KiwoomService | 현재가 조회 |
| `/api/kiwoom/daily/:symbol` | GET | `KiwoomService.getDailyData()` | KiwoomService | 일봉 데이터 조회 |
| `/api/kiwoom/account/:accountNumber?` | GET | `KiwoomService.getAccountBalance()` | KiwoomService | 계좌 잔고 조회 |

### 주요 호출 체인

```
/api/kiwoom/daily/:symbol
└── KiwoomService.getDailyData(symbol, days)
    ├── YahooFinanceService.getHistoricalData() (우선 시도)
    ├── 키움 API 호출 (연결시)
    ├── getSimulationDailyData() (fallback - 시뮬레이션)
    └── TurtleAnalyzer.detectSimulationData() (필터링)

/api/kiwoom/account
└── KiwoomService.getAccountBalance()  
    ├── 키움 API 인증 및 계좌조회
    └── 시뮬레이션 데이터 (fallback)
```

---

## 재무데이터 관련 API

### `/api/financial-data/*`

| 엔드포인트 | 메소드 | 주요 함수 | 호출 서비스 | 설명 |
|-----------|-------|-----------|-------------|------|
| `/api/financial-data/cache/stats` | GET | `FinancialData.aggregate()` | MongoDB | 재무데이터 캐시 통계 |
| `/api/financial-data/stock/:stockCode` | GET | `FinancialDataCacheService.getFinancialData()` | FinancialDataCacheService | 개별 종목 재무데이터 |

---

## 포지션/거래 관련 API

### `/api/positions/*`, `/api/trades/*`, `/api/turtle-positions/*`

| 엔드포인트 | 메소드 | 주요 함수 | 호출 서비스 | 설명 |
|-----------|-------|-----------|-------------|------|
| `/api/positions/` | GET | `KiwoomService.getAccountBalance()` | KiwoomService | 보유 포지션 조회 |
| `/api/turtle-positions/list` | GET | `PortfolioTracker.syncWithKiwoomAccount()` | PortfolioTracker | 터틀 포지션 목록 |
| `/api/turtle-positions/detail/:symbol` | GET | `PortfolioTracker.getPositionDetail()` | PortfolioTracker | 터틀 포지션 상세 |
| `/api/turtle-pyramiding/analyze` | GET | `TurtlePyramiding.analyzeAllPositions()` | TurtlePyramiding | 피라미딩 분석 |

---

## 테스트 API

### `/api/test/*`, `/api/test500/*`

| 엔드포인트 | 메소드 | 주요 함수 | 설명 |
|-----------|-------|-----------|------|
| `/api/test/turtle/:symbol` | GET | `TurtleAnalyzer.analyzeStock()` | 개별 종목 터틀 분석 테스트 |
| `/api/test500/system-health` | GET | 시스템 전반 헬스체크 | 각종 API 연결상태 확인 |

---

## 🔧 주요 서비스별 핵심 함수

### TurtleAnalyzer
- `analyzeMarket()`: 전체 시장 분석
- `analyzeStock(symbol, name)`: 개별 종목 분석  
- `getPriceData(symbol, days)`: 가격 데이터 조회
- `calculateATR(priceData)`: ATR(N값) 계산
- `detectSimulationData(data, symbol)`: 시뮬레이션 데이터 감지

### KiwoomService  
- `getCurrentPrice(symbol)`: 현재가 조회
- `getDailyData(symbol, days)`: 일봉 데이터 조회
- `getAccountBalance()`: 계좌 잔고 조회
- `getSimulationDailyData()`: 시뮬레이션 데이터 생성

### StockNameCacheService
- `getStockName(stockCode)`: 종목명 조회 (메모리캐시→DB→fallback)
- `getBulkStockNames(stockCodes)`: 대량 종목명 조회

### SuperstocksAnalyzer
- `analyzeSuperstocks()`: 슈퍼스톡 전체 분석
- `analyzeSingleStock(stockCode)`: 개별 종목 슈퍼스톡 분석

---

## 🚨 중요한 필터링 및 검증 로직

### 터틀 신호 필터링 (`TurtleAnalyzer.analyzeMarket()`)
1. **시뮬레이션 데이터 제외**: `detectSimulationData()`
2. **데이터 부족 신호 제외**: 손절가/투자금액/ATR이 "데이터부족"인 경우
3. **코넥스 종목 제외**: `['216400']` 등 코넥스 종목 리스트
4. **중복 신호 제거**: 같은 종목의 중복 신호 제거

### 종목명 보정 (모든 종목명 관련 함수)
```javascript
const correctedNames = {
  '009150': '삼성전기',     // 엘포유 → 삼성전기  
  '196170': '알테오젠',     // 비티에스제2호사모투자 → 알테오젠
  '042660': '한화오션',     // 뉴유라이프코리아 → 한화오션
};
```

---

## 📊 주요 데이터 플로우

### 아침 터틀 신호 알림 생성 과정
1. `TurtleAnalyzer.analyzeMarket()` 호출
2. 전체 종목 리스트를 순회하며 `analyzeStock()` 실행
3. 각 종목별로 `getPriceData()` → `KiwoomService.getDailyData()` 호출
4. 시뮬레이션 데이터 감지 및 필터링
5. 터틀 지표 계산 (20일 고점, 10일 저점, ATR)
6. BUY_20/SELL_10 신호 생성
7. 투자금액 및 손절가 계산
8. 데이터 부족/코넥스 종목 필터링
9. `SlackMessageFormatter.formatBuySignals()` 호출
10. 최종 알림 메시지 생성

---

*이 문서는 2025년 9월 2일 기준으로 작성되었으며, 코드 변경시 함께 업데이트되어야 합니다.*