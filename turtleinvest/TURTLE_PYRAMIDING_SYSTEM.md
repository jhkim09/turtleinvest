# 터틀 피라미딩 시스템 (Turtle Pyramiding System)

## 📋 시스템 개요

터틀 트레이딩 전략의 **추가매수(피라미딩)** 기능을 구현한 모듈화 시스템입니다. 키움증권 실계좌와 연동하여 실시간으로 추가매수 타이밍을 분석하고, Make.com을 통해 자동 알림을 제공합니다.

### 🎯 핵심 기능
- **0.5N 단위 추가매수** 타이밍 자동 감지
- **실제 키움증권 잔고** 기반 포지션 추적
- **ATR 기반 리스크 관리** (손절가 자동 계산)
- **Make.com 연동** 자동 알림 시스템
- **모듈화 아키텍처**로 독립적 테스트 가능

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Make.com Scheduler                        │
│              (매일 8:50 AM 자동 실행)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│             /api/turtle-pyramiding/analyze                  │
│                  (메인 분석 엔드포인트)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────┬───────────────┬─────────────────┬─────────┐
│  키움 잔고 조회  │  터틀 포지션   │  추가매수 신호   │  알림   │
│                │     생성       │     체크        │  전송   │
│ KiwoomService  │ PortfolioTracker│ TurtlePyramiding│ Make.com│
└─────────────────┴───────────────┴─────────────────┴─────────┘
```

## 🧩 모듈 구성

### 1. `turtlePyramiding.js` - 추가매수 로직 전담
```javascript
// 핵심 기능들
TurtlePyramiding.checkAddSignal(position, currentPrice)
TurtlePyramiding.checkStopLossSignal(position, currentPrice) 
TurtlePyramiding.updatePositionAfterAdd(position, addPrice)
TurtlePyramiding.calculateNewAveragePrice(position, addPrice)
```

**주요 역할:**
- 0.5N 단위 추가매수 타이밍 계산
- 평균가 및 손절가 업데이트
- 포지션 사이징 및 리스크 계산
- 유닛별 진입가 관리

### 2. `portfolioTracker.js` - 포지션 상태 추적
```javascript  
// 핵심 기능들
portfolioTracker.syncWithKiwoomAccount()
portfolioTracker.createNewTurtlePosition(kiwoomPosition)
portfolioTracker.calculateATR(priceData, period)
```

**주요 역할:**
- 키움증권 실제 잔고 동기화
- ATR(Average True Range) 자동 계산
- 터틀 포지션 메타데이터 관리
- 포트폴리오 리스크 모니터링

### 3. `turtleNotification.js` - 통합 알림 시스템
```javascript
// 핵심 기능들
turtleNotification.analyzeDailySignals()
turtleNotification.generateNotificationMessages(results)
turtleNotification.sendNotifications(notifications)
```

**주요 역할:**
- 신규진입 + 추가매수 + 손절 신호 통합
- 우선순위별 알림 분류 (URGENT → HIGH → MEDIUM → LOW)
- Make.com 연동으로 슬랙/텔레그램 전송
- 일일 포트폴리오 리포트 생성

## 🔄 일일 실행 프로세스

### 매일 8:50 AM 자동 실행 순서:

1. **Make.com 스케줄러** 트리거
2. **HTTP 요청** → `/api/turtle-pyramiding/analyze`
3. **키움 잔고 조회** → 실제 보유종목 데이터
4. **터틀 포지션 생성** → ATR 계산, 손절가/추가매수가 설정
5. **신호 분석**:
   - 추가매수 신호: 현재가 ≥ 진입가 + (0.5N × 레벨)
   - 손절 신호: 현재가 ≤ 평균가 - 2N
   - 신규 진입: 20일 최고가 돌파
6. **알림 전송** → 텔레그램/슬랙 즉시 알림

## 🎛️ API 엔드포인트

### 1. `/api/turtle-pyramiding/analyze` (메인)
**용도:** Make.com에서 호출하는 일일 분석 엔드포인트

**응답 예시:**
```json
{
  "success": true,
  "timestamp": "2025-01-20T08:50:00.000Z",
  "summary": {
    "newEntrySignals": 2,
    "addPositionSignals": 1, 
    "stopLossSignals": 0,
    "portfolioPositions": 3
  },
  "signals": {
    "addPositions": [{
      "symbol": "005930",
      "name": "삼성전자", 
      "currentPrice": 72500,
      "addLevel": 2,
      "addAmount": 7250000,
      "newAveragePrice": 71250,
      "newStopLoss": 67250
    }],
    "stopLoss": [...],
    "newEntries": [...]
  },
  "notifications": [{
    "type": "ADD_POSITION",
    "priority": "HIGH",
    "title": "📈 터틀 추가매수 타이밍!",
    "message": "🚀 1개 종목 추가매수 타이밍!\n\n📈 삼성전자(005930)...",
    "urgency": "MEDIUM"
  }]
}
```

### 2. `/api/turtle-pyramiding/portfolio` 
**용도:** 포트폴리오 현황 간단 조회

### 3. `/api/turtle-pyramiding/test`
**용도:** 시뮬레이션 데이터로 시스템 테스트

## 🧪 테스트 시스템

### 독립 테스트 실행:
```bash
cd turtleinvest
node backend/test/turtlePyramidingTest.js
```

### 테스트 시나리오:
1. **TurtlePyramiding 모듈** - 추가매수 로직 검증
2. **PortfolioTracker 모듈** - ATR 계산 및 포지션 생성
3. **TurtleNotification 모듈** - 알림 메시지 생성
4. **통합 시나리오** - 3단계 피라미딩 시뮬레이션

## 📱 Make.com 설정 가이드

### 1단계: 스케줄러 설정
```
- 모듈: Schedule → Every day
- 시간: 08:50 (한국시간)
- 요일: 월~금 (주말 제외)
```

### 2단계: HTTP 요청 설정  
```
- URL: https://turtleinvest.onrender.com/api/turtle-pyramiding/analyze
- Method: GET
- Headers: Content-Type: application/json
```

### 3단계: 조건 분기 설정
```javascript
// Router 조건들
{{summary.addPositionSignals}} > 0   // 추가매수 알림
{{summary.stopLossSignals}} > 0     // 긴급 손절 알림  
{{summary.newEntrySignals}} > 0     // 신규 진입 알림
```

### 4단계: 텔레그램 알림 설정
```json
{
  "text": "{{notifications.1.title}}\n\n{{notifications.1.message}}",
  "chatId": "YOUR_CHAT_ID",
  "parseMode": "Markdown"
}
```

## 🔐 환경변수 설정

### Render 배포시 필수 환경변수:
```bash
MAKE_WEBHOOK_URL_TURTLE_NOTIFICATION=https://hook.integromat.com/your-webhook-url
KIWOOM_APP_KEY=your_kiwoom_app_key
KIWOOM_SECRET_KEY=your_kiwoom_secret_key
MONGODB_URI=your_mongodb_connection_string
```

## 🎯 터틀 트레이딩 규칙

### 추가매수 (피라미딩) 규칙:
- **진입 조건**: 20일 최고가 돌파
- **추가매수**: 마지막 진입가에서 **0.5N씩 상승**할 때마다
- **최대 유닛**: **4-5유닛**까지 (설정 가능)
- **손절가**: **평균가 - 2N** (추가매수할 때마다 업데이트)

### N값 (ATR) 계산:
```javascript
N = ATR(20일) = Average True Range
True Range = Max(고가-저가, |고가-전일종가|, |저가-전일종가|)
```

### 포지션 사이징:
```javascript
유닛 사이즈 = 총 자본 × 2% ÷ N값
리스크 = 유닛 사이즈 × 2N (손절 거리)
```

## 📊 실전 예시

### 삼성전자 피라미딩 시나리오:
```
초기 진입: 70,000원 (100주)
N값: 2,000원

1차 추가매수: 71,000원 (70,000 + 0.5×2,000)
2차 추가매수: 72,000원 (71,000 + 0.5×2,000) 
3차 추가매수: 73,000원 (72,000 + 0.5×2,000)

각 단계별 평균가, 손절가 자동 재계산
최종 손절가: 평균가 - 4,000원 (2N)
```

## 🚀 배포 및 실행

### 배포:
```bash
git add .
git commit -m "Add turtle pyramiding updates"
git push origin master
# Render 자동 배포
```

### 실행 확인:
- **Make.com**: 매일 8:50 AM 스케줄러 작동
- **텔레그램**: 신호 발생시 즉시 알림
- **Render 로그**: 실행 과정 모니터링

## 🔧 트러블슈팅

### 자주 발생하는 문제들:

1. **키움 API 인증 실패**
   - 환경변수 KIWOOM_APP_KEY, KIWOOM_SECRET_KEY 확인
   - API 사용 한도 확인

2. **Make.com 연결 실패**
   - webhook URL 환경변수 확인
   - CORS 설정 확인

3. **ATR 계산 오류**
   - 일봉 데이터 20일 이상 필요
   - Yahoo Finance API 백업 로직 작동

4. **MongoDB 연결 문제**
   - 연결 실패해도 서버는 정상 동작
   - 시뮬레이션 모드로 fallback

## 📈 향후 개선 계획

- [ ] **실시간 가격 연동** (WebSocket)
- [ ] **백테스팅 시스템** 추가
- [ ] **리스크 한도 설정** 기능
- [ ] **다중 계좌 지원**
- [ ] **성과 분석 대시보드**

---

**개발 완료일**: 2025-01-20  
**테스트 예정일**: 2025-01-21 08:50 (첫 실전 테스트)  
**개발자**: Claude Code Assistant  
**라이선스**: Private Use Only