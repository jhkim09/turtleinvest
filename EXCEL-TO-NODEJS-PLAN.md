# 📊→🟢 Excel 엔진 Node.js 포팅 계획서

## 🎯 목표
**파인북 Excel 엔진을 Node.js로 완전 포팅하여 웹 서비스화**

---

## 📋 현재 Excel 파일 분석 결과

### **파일**: `파인북 엔진_20200503_파인애플1차반영(투자성향,위험성향).xlsm`

#### **시트 구조**:
1. **Finbook** (B1:J16) - 메인 결과 시트
2. **0.기본정보** (B1:X9) - 사용자 기본 데이터
3. **입력** (A1:N16) - 설문 입력값
4. **투자** (B1:U119) - 투자성향 분석 로직 ⭐ **핵심**
5. **위험** (B1:U93) - 위험성향 분석 로직 ⭐ **핵심**
6. **결과** (A1:D8) - 최종 점수 및 등급

---

## 🚀 포팅 전략 (3단계)

### **1단계: 데이터 추출** (1-2일)
```javascript
// 목표 결과물 예시
const excelData = {
  questions: [...], // 질문 데이터
  weights: {...}, // 가중치 테이블
  logic: {...} // 계산 로직
};
```

### **2단계: 로직 변환** (3-4일)
```javascript
// 목표 결과물 예시
const finbookEngine = {
  calculateInvestmentScore: (answers) => { /* 투자성향 점수 */ },
  calculateRiskScore: (answers) => { /* 위험성향 점수 */ },
  generateProfile: (scores) => { /* 최종 프로필 */ }
};
```

### **3단계: API 연동** (2-3일)
```javascript
// 목표 결과물 예시
app.post('/api/analyze-profile', (req, res) => {
  const result = finbookEngine.analyze(req.body.answers);
  res.json(result);
});
```

---

## 🛠️ 기술적 접근법

### **사용할 도구들**
- **XLSX 라이브러리**: Excel 파일 읽기 (이미 설치됨)
- **기존 Node.js 환경**: `eap-service/backend` 활용
- **JSON 파일**: 변환된 로직 저장용

### **작업 순서**
1. **Excel 셀 매핑** → JavaScript 변수로 변환
2. **수식 분석** → if문/함수로 변환  
3. **테스트 케이스** → 기존 결과와 비교 검증
4. **API 래핑** → REST 엔드포인트로 제공

---

## 📊 1단계: Excel 데이터 추출 상세 계획

### **목표 파일 생성**
```
eap-service/backend/engine/
├── raw-data/
│   ├── questions.json      # 설문 문항
│   ├── weights.json        # 가중치 테이블
│   └── formulas.json       # 계산 공식
├── processors/
│   ├── investment.js       # 투자성향 계산
│   ├── risk.js            # 위험성향 계산
│   └── profile.js         # 프로필 생성
└── index.js               # 메인 엔진
```

### **첫 번째 스크립트 작성**
```javascript
// excel-extractor.js - Excel 데이터를 JSON으로 추출
const XLSX = require('xlsx');

const extractExcelLogic = () => {
  const workbook = XLSX.readFile('../../eap-service-deploy/finbook/파인북 엔진_20200503_파인애플1차반영(투자성향,위험성향).xlsm');
  
  // 각 시트별 데이터 추출
  const investmentLogic = extractInvestmentLogic(workbook.Sheets['투자']);
  const riskLogic = extractRiskLogic(workbook.Sheets['위험']);
  const questions = extractQuestions(workbook.Sheets['입력']);
  
  return { investmentLogic, riskLogic, questions };
};
```

---

## 🔍 분석 우선순위

### **가장 먼저 해야 할 것**
1. **투자성향 시트 (119행)** 완전 분석
   - 어떤 질문들이 있는지
   - 점수 계산 방식이 무엇인지
   - 가중치가 어떻게 적용되는지

2. **위험성향 시트 (93행)** 완전 분석
   - 투자성향과 어떻게 연결되는지
   - 최종 등급 산출 방식

3. **질문지 매핑**
   - Excel 입력값과 실제 질문의 연결 관계

---

## 🧪 테스트 계획

### **검증 방법**
1. **기존 PDF 샘플** (`FinBook_박아영_2020-10-03.pdf`)과 비교
2. **동일한 입력값** → **동일한 결과** 확인
3. **경계값 테스트** (최고점, 최저점, 중간값)

### **테스트 케이스 준비**
```javascript
// test-cases.js
const testCases = [
  {
    name: "박아영 샘플",
    input: { /* 알려진 입력값 */ },
    expected: { /* PDF에서 추출한 예상 결과 */ }
  },
  // ... 추가 테스트 케이스들
];
```

---

## 📅 일주일 작업 계획

### **Day 1: Excel 파일 완전 분석**
- [ ] 각 시트별 데이터 구조 파악
- [ ] 핵심 계산 셀 식별
- [ ] 입력/출력 관계 매핑

### **Day 2: 질문지 연동**
- [ ] 설문지 파일과 Excel 입력 매핑
- [ ] 질문 → 점수 변환 로직 분석
- [ ] JSON 스키마 설계

### **Day 3: 투자성향 로직 포팅**
- [ ] 119행 투자 시트 분석
- [ ] JavaScript 함수로 변환
- [ ] 기본 테스트

### **Day 4: 위험성향 로직 포팅**  
- [ ] 93행 위험 시트 분석
- [ ] JavaScript 함수로 변환
- [ ] 통합 테스트

### **Day 5: 통합 및 검증**
- [ ] 전체 엔진 통합
- [ ] 기존 결과와 비교 검증
- [ ] API 엔드포인트 연결

### **Day 6-7: 완성도 높이기**
- [ ] 에러 처리 추가
- [ ] 성능 최적화
- [ ] 코드 정리 및 문서화

---

## 🆘 예상 어려움과 해결책

### **예상 문제점**
1. **복잡한 Excel 수식** → 단계별로 분해하여 이해
2. **한글 변수명** → 의미 있는 영어 변수로 변환
3. **숨겨진 로직** → 셀별 상세 분석으로 찾아내기
4. **검증 부족** → 충분한 테스트 케이스 준비

### **지원 방식**
- **매일 진행상황 점검** 및 막힌 부분 해결
- **코드 리뷰** 및 최적화 제안
- **버그 발생시** 즉시 디버깅 지원
- **단계별 성취감** 확인 및 격려

---

## 🎉 성공 기준

### **1주차 완료 목표**
```javascript
// 이런 코드가 동작해야 함
const result = finbookEngine.analyze({
  age: 35,
  income: 5000,
  family: 2,
  answers: [3, 1, 4, 2, ...] // 설문 답변
});

console.log(result);
// {
//   investmentStyle: "적극투자형",
//   riskProfile: "중위험",
//   score: 75,
//   recommendations: [...],
//   report: "..."
// }
```

### **최종 목표**
- **기존 Excel과 100% 동일한 결과**
- **API로 호출 가능**
- **확장 가능한 구조**
- **충분한 테스트 커버리지**

---

**다음 작업**: Excel 파일 상세 분석부터 시작! 🚀

---

**문서 작성일**: 2024년 9월 2일  
**예상 완료일**: 2024년 9월 9일  
**담당자**: Claude Code + 사용자