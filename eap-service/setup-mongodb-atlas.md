# MongoDB Atlas 무료 계정 설정 가이드

## 1. MongoDB Atlas 계정 생성
1. https://cloud.mongodb.com/ 접속
2. "Try Free" 클릭하여 무료 계정 생성
3. Google/GitHub 계정으로 간편 로그인 가능

## 2. 무료 클러스터 생성
1. "Build a Database" 클릭
2. **Shared (FREE)** 선택
3. **AWS** 클라우드 선택
4. **ap-northeast-2 (Seoul)** 지역 선택 (한국)
5. **M0 Sandbox (FREE)** 선택
6. 클러스터 이름: `eap-cluster`

## 3. 보안 설정
### Database User 생성:
- Username: `eap-admin`
- Password: 강력한 비밀번호 생성 (자동생성 추천)

### Network Access 설정:
- "Add IP Address" 클릭
- "Allow Access from Anywhere" 선택 (0.0.0.0/0)
- 또는 특정 IP만 허용 (더 안전)

## 4. 연결 문자열 받기
1. "Connect" 버튼 클릭
2. "Drivers" 선택
3. **Node.js** 선택
4. 연결 문자열 복사:

```
mongodb+srv://eap-admin:<password>@eap-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## 5. 백엔드 설정
`backend/.env` 파일에 다음 추가:
```
MONGODB_URI=mongodb+srv://eap-admin:<password>@eap-cluster.xxxxx.mongodb.net/eap-service?retryWrites=true&w=majority
```

## 6. 테스트
```bash
cd backend
npm start
```

## 무료 계정 제한사항
- ✅ **512MB 저장소** (테스트/소규모 운영 충분)
- ✅ **무제한 연결**
- ✅ **AWS 클라우드 호스팅**
- ✅ **SSL 암호화**
- ❌ 백업 기능 제한
- ❌ 고급 모니터링 제한

## 다른 무료 대안들
1. **MongoDB Community Edition** (로컬 설치)
2. **Railway** (무료 500시간/월)
3. **PlanetScale** (MySQL, 무료 계층)
4. **Supabase** (PostgreSQL, 무료 계층)

## AWS 배포 시
- MongoDB Atlas는 AWS와 완벽 호환
- 같은 지역(Seoul) 선택으로 지연시간 최소화
- VPC Peering 설정 가능 (유료 계층)