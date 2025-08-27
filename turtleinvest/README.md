# 🐢 TurtleInvest

터틀트레이딩 & 슈퍼스톡스 전략 기반 자동 투자 분석 API 시스템

## 🎯 프로젝트 목표

- **매일 아침 투자 신호 알람**: 20일/10일 돌파 기반 매수/매도 신호
- **슈퍼스톡스 분석**: PSR ≤0.75, 성장률 ≥15% 조건 분석
- **실제 포지션 기반 리스크 관리**: 2% 리스크 룰 자동 계산
- **스마트 주문량 계산**: ATR 기반 정확한 포지션 사이징
- **자동 알람 시스템**: Make.com 연동 메신저 알람
- **재무데이터 캐싱**: 연 1회 수집으로 안정적 운영

## 📚 터틀트레이딩 전략

### 핵심 규칙
- **진입**: 20일 최고가 돌파시 매수
- **청산**: 10일 최저가 하향 돌파시 매도  
- **리스크**: 거래당 총 자산의 2% 제한
- **포지션 사이징**: ATR(변동성) 기반 계산

### 시스템의 장점
- 감정 배제된 기계적 투자
- 추세 추종으로 큰 수익 포착
- 체계적 리스크 관리
- 검증된 역사적 성과

## 🏗️ 시스템 아키텍처

```
TurtleInvest (API 전용)
├── backend/                    # Node.js API 서버
│   ├── models/                # 데이터 모델
│   │   ├── FinancialData.js   # 재무데이터 캐싱
│   │   ├── Portfolio.js       # 포지션 관리
│   │   ├── Signal.js         # 투자 신호
│   │   └── Trade.js          # 거래 기록
│   ├── services/             # 핵심 분석 엔진
│   │   ├── turtleAnalyzer.js        # 터틀 트레이딩 (500개 종목)
│   │   ├── superstocksAnalyzer.js   # 슈퍼스톡스 (500개 종목)
│   │   ├── financialDataCacheService.js # 재무데이터 캐싱
│   │   ├── stockListService.js      # 통합 종목 관리
│   │   ├── kiwoomService.js         # 키움 API
│   │   └── dartService.js           # DART API
│   ├── routes/               # REST API 엔드포인트
│   │   ├── signals.js        # 신호 분석 API
│   │   ├── financialData.js  # 재무데이터 관리 API
│   │   └── positions.js      # 포지션 관리 API
│   └── scheduler/            # 자동화 스케줄러
└── docs/                     # 문서 및 가이드
```

## 🚀 주요 기능

### 1. 실시간 시장 분석
- 키움 OpenAPI 연동
- 20일/10일 이동 고저점 자동 계산
- ATR(평균진폭) 변동성 측정
- 매수/매도 신호 실시간 감지

### 2. 포지션 & 리스크 관리
- 현재 보유 종목 실시간 추적
- 개별 포지션 손익 계산
- 2% 리스크 룰 자동 적용
- 손절가격 자동 계산

### 3. 스마트 주문량 계산
- ATR 기반 포지션 사이징
- 가용자금 대비 최적 주문량
- 리스크 한도 내 최대 투자

### 4. 매매 기록 시스템
- 실제 체결가 수동 입력
- 수수료/세금 자동 계산
- 거래 히스토리 저장
- 성과 분석 및 통계

### 5. 스마트 알람
- Make.com JSON webhook 연동
- 매일 아침 종합 리포트
- 긴급 신호 실시간 알람
- 카카오톡/텔레그램 메신저 발송

## 💰 사용 시나리오

### 초기 설정
1. 최초 잔고 입력 (예: 5,000만원)
2. 관심 종목 리스트 등록
3. Make.com webhook URL 설정

### 일일 운영
1. **아침 8시**: 자동 분석 → 알람 발송
2. **거래 실행**: 사용자가 실제 매매
3. **기록 입력**: 체결가/수량 시스템에 기록
4. **자동 업데이트**: 잔고/리스크 재계산

### 예시 알람
```
🐢 터틀 신호 (08.17)
💰 가용자금: 3,500만원

🔥 매수 신호:
• 삼성전자 20일 돌파
  → 추천 주문량: 15주 
  → 리스크: 75만원 (2%)

⚡ 매도 신호:  
• SK하이닉스 10일 하향돌파
  → 보유 10주 전량 매도
```

## 🛠️ 기술 스택

- **Backend**: Node.js + Express + MongoDB
- **Data Sources**: 키움 OpenAPI Plus + DART API (+ Yahoo Finance 백업)
- **Financial Cache**: MongoDB with annual collection strategy
- **Scheduler**: node-cron (daily analysis + annual data update)
- **Notifications**: Make.com webhook
- **Database**: MongoDB (포지션, 거래기록, 재무데이터 캐시)

## 📊 투자 전략

### 🐢 터틀 트레이딩 (500개 종목)
- **순수 기술적**: 20일 돌파 + ATR 리스크 관리
- **하이브리드**: 기술적 신호 + 재무건전성 필터 (매출성장률 ≥10%, PSR ≤3.0)

### ⭐ 슈퍼스톡스 (500개 종목) 
- **엄격한 재무조건**: 매출성장률 ≥15%, 순이익성장률 ≥15%, PSR ≤0.75
- **연 1회 데이터 업데이트**: 매년 4월 1일 전년도 재무데이터 수집

## 🚀 주요 API 엔드포인트

### 신호 분석
- `POST /api/signals/analyze` - 터틀 신호 분석 (기술적)
- `POST /api/signals/analyze-with-financial-filter` - 터틀 + 재무 필터
- `POST /api/signals/make-analysis` - 슈퍼스톡스 분석

### 재무데이터 관리  
- `POST /api/financial-data/bulk/unified` - 500개 종목 일괄 수집
- `GET /api/financial-data/cache/stats` - 캐시 통계
- `GET /api/financial-data/stock/:code` - 개별 종목 재무데이터

### 터틀 포지션 관리 (2025.08.27 추가)
- `POST /api/turtle-positions/register-from-tally` - Tally 폼 터틀 매수 기록 웹훅
- `GET /api/turtle-positions/list` - 터틀 포지션 목록 및 키움 동기화
- `GET /api/turtle-positions/detail/:symbol` - 특정 종목 터틀 상세 정보
- `DELETE /api/turtle-positions/remove/:symbol` - 터틀 포지션 기록 삭제

---

**📝 개발 시작일**: 2024.08.17  
**🎯 목표**: 실제 터틀트레이딩 전략을 자동화하여 일관된 투자 실행
