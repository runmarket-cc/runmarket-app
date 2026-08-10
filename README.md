# 🏃‍♂️ RunMarket App (`runmarket-app`)

> **러닝 실시간 위치 공유 & 관전 모바일 애플리케이션 (iOS / Android)**  
> 러너(RUNNER)의 GPS 위치와 페이스 데이터를 실시간으로 관전 지도(SPECTATOR)에 라이브 스트리밍하고, iOS Live Activity 및 Apple HealthKit과 연동되는 Expo / React Native 기반 앱입니다.

---

## 🌐 RunMarket 전체 아키텍처 & 연관 프로젝트

RunMarket 생태계는 모바일 앱, 백엔드 API, 웹 프론트엔드, 그리고 Kubernetes 인프라로 구성되어 있습니다.

```
                  ┌─────────────────────────────────┐
                  │   runmarket-front (Web Frontend) │
                  │      https://runmarket.cc       │
                  └────────────────┬────────────────┘
                                   │ (회원가입 & Turnstile 인증)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          runmarket-app (Mobile App)                     │
│                        Bundle ID: cc.runmarket.app                      │
│                                                                         │
│  - Expo SDK 56 / React Native 0.85                                      │
│  - RUNNER: GPS 실시간 위치 수집 (expo-location)                         │
│  - SPECTATOR: 그룹 / 러너 라이브 관전 (react-native-maps)               │
│  - iOS Live Activity / Dynamic Island 타겟 모듈                         │
│  - Apple HealthKit 달리기 운동 자동 연동                                 │
│  - SQLite 기반 오프라인 기록 저장 & 동기화                              │
└──────────────┬──────────────────────────────────┬───────────────────────┘
               │                                  │
      HTTP REST│                                  │WebSocket
   (JWT Bearer)│                                  │(Real-time Location)
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          pacer (Backend Service)                        │
│                   Spring Boot / Kotlin 멀티모듈 백엔드                  │
│                                                                         │
│  - REST API : https://api.runmarket.cc                                  │
│  - WebSocket: wss://pulse.runmarket.cc                                  │
│  - Modules  : web, socket, domain, infrastructure, batch, event-bus     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                        K8s Helm Deployment
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         iac (Infrastructure)                            │
│                 Kubernetes / Helm Charts (`helm/runmarket`)             │
│                                                                         │
│  - Docker Image : gudrb963/runmarket-api                                │
│  - Database     : PostgreSQL 17 (Persistent Volume)                     │
│  - Ingress      : Nginx Ingress Controller (`api.runmarket.cc`)         │
│  - Secrets      : JWT Secret, Admin Auth, DB Credentials                │
│  - Performance  : `helm/runmarket-loadtest` (부하 테스트)               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 각 프로젝트별 상세 역할 (Project Roles & Responsibilities)

RunMarket 시스템을 구성하는 4개 핵심 프로젝트의 역할 및 구체적 담당 기능은 다음과 같습니다.

| 프로젝트명 | 경로 / 도메인 | 주요 역할 & 담당 기능 |
|---|---|---|
| **`runmarket-app`** | `/runmarket/runmarket-app`<br>`cc.runmarket.app` | **크로스플랫폼 모바일 앱 (iOS/Android)**<br>• 러너(RUNNER): GPS 위치/페이스 수집 및 백엔드로 실시간 전송<br>• 관전자(SPECTATOR): 지도 위 러너 위치 및 이동 동선 실시간 라이브 트래킹<br>• iOS Dynamic Island / 잠금 화면 Live Activity 실시간 현황 표시<br>• Apple HealthKit 운동 자동 동기화 & SQLite 오프라인 기록 저장 |
| **`pacer`** | `/runmarket/pacer`<br>`api.runmarket.cc`<br>`pulse.runmarket.cc` | **백엔드 핵심 코어 API & WebSocket 중계 서버**<br>• REST API: 회원 로그인, 인증 토큰(JWT) 발급, 레이스/달리기 기록 CRUD<br>• WebSocket Broker: 러너의 위치 메세지를 실시간 수신 및 관전자 채널로 브로드캐스트<br>• 보안 & 권한 제어: Turnstile 캡차 검증, 소켓 엑세스 토큰 발급 및 검증<br>• Spring Boot 멀티모듈 (`web`, `socket`, `domain`, `infrastructure`, `batch`, `event-bus`) |
| **`runmarket-front`** | `/runmarket/runmarket-front`<br>`runmarket.cc` | **웹 플랫폼 & 회원가입 웹사이트**<br>• 신규 사용자 회원가입 및 계정 관리 (앱에서는 회원가입 불가, 웹에서만 가능)<br>• 서비스 랜딩 페이지, 안내 및 웹 기반 레이스/러닝 서비스 렌더링<br>• Cloudflare Turnstile 캡차 위젯 렌더링 지원<br>• Next.js (App Router) / React / Tailwind CSS / Shadcn UI 기반 프론트엔드 |
| **`iac`** | `/iac`<br>`Kubernetes Cluster` | **클라우드 인프라 & K8s 배포 매니페스트 (Infrastructure as Code)**<br>• Kubernetes Helm Chart (`helm/runmarket`)를 통한 백엔드 배포 자동화<br>• PostgreSQL 17 DB 컨테이너 배포 및 Persistent Volume 스토리지 관리<br>• Nginx Ingress 컨트롤러 설정 (도메인 라우팅, SSL/TLS 패스스루, 헬스체크)<br>• K8s Secret 관리 (JWT 암호화 키, DB 계정 정보 등)<br>• `helm/runmarket-loadtest`: 소켓 및 HTTP 성능 부하 테스트 실행 |

---

## ✨ 주요 기능 (Key Features)

1. **🔒 Cloudflare Turnstile WebView 인증**
   - 웹 기반 Turnstile CAPTCHA를 앱 내 WebView로 렌더링 후 검증 토큰 추출
   - 백엔드 REST API(`POST /api/v1/auth/login`) 호출 및 JWT `expo-secure-store` 안전 저장

2. **📡 실시간 GPS 트래킹 & 라이브 관전 (RUNNER & SPECTATOR)**
   - **RUNNER 모드**: `expo-location` 백그라운드 GPS 서비스를 활성화하여 러닝 데이터(위도, 경도, 페이스, 이동거리, 소요시간)를 WebSocket(`wss://pulse.runmarket.cc/ws/runner/{runnerId}`)으로 실시간 스트리밍
   - **SPECTATOR 모드**: 그룹 코드 또는 특정 러너 소켓(`wss://pulse.runmarket.cc/ws/group/{groupId}`)을 구독하여 `react-native-maps` 지도 위에 러너 마커 및 운동 현황을 실시간 표시

3. **📱 iOS Live Activity & Dynamic Island 지원**
   - iOS 커스텀 네이티브 모듈 (`modules/runmarket-live-activity`) 및 Apple Targets (`targets/widget`)을 통해 화면이 잠겨 있거나 Dynamic Island 상에서 실시간 러닝 스탯 표시

4. **🏃‍♂️ Apple HealthKit 연동**
   - `@kingstinct/react-native-healthkit`을 활용하여 러닝 완료 후 Apple 건강 앱의 "달리기" 운동으로 자동 동기화 및 소모 칼로리 기록

5. **💾 SQLite 오프라인 저장 & 동기화**
   - `expo-sqlite` 기반 로컬 DB에 러닝 기록 저장
   - 네트워크 연결 복구 시 서버 REST API(`POST /api/v1/runs`)로 로컬 기록 자동 동기화 (`runSync.ts`)

6. **📊 크래시 리포팅 및 텔레메트리**
   - `@sentry/react-native` 연동을 통한 실시간 앱 크래시 및 오류 모니터링

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 |
|---|---|
| **Core Framework** | React Native `0.85`, Expo SDK `56` |
| **Routing** | Expo Router (`expo-router`) |
| **Language** | TypeScript `6.0` |
| **State Management** | Zustand `5.0` |
| **HTTP / Socket** | Axios, Native WebSocket Client |
| **Maps & Location** | `react-native-maps`, `expo-location` |
| **Local Storage** | `expo-sqlite`, `expo-secure-store` |
| **iOS Extensions** | `@bacons/apple-targets`, Custom Live Activity Swift Module |
| **Health Integration** | `@kingstinct/react-native-healthkit` |
| **Crash Monitoring** | `@sentry/react-native` |
| **Build & Deploy** | EAS (Expo Application Services) Build & Submit |

---

## 📁 디렉토리 구조 (Directory Structure)

```
runmarket-app/
├── app/                          # Expo Router 파일 기반 라우팅
│   ├── (auth)/                   # 로그인 / 인증 화면 (Turnstile WebView)
│   ├── (tabs)/                   # 메인 탭 (레이스 목록, 마이페이지 등)
│   ├── run/                      # 러닝 / 관전 핵심 화면
│   └── _layout.tsx               # 루트 레이아웃 & 내비게이션 프로바이더
├── src/
│   ├── api/                      # Axios HTTP 클라이언트 및 REST API 호출 모듈
│   ├── components/               # 재사용 가능한 UI 컴포넌트
│   ├── constants/                # 공통 상수 정의
│   ├── hooks/                    # 커스텀 React 훅
│   ├── services/                 # 백그라운드 GPS, HealthKit, SQLite DB 및 Sync 서비스
│   ├── store/                    # Zustand 글로벌 상태 스토어 (인증, 러닝 상태 등)
│   └── types/                    # TypeScript 타입 정의
├── modules/
│   └── runmarket-live-activity/  # iOS Live Activity Swift/Nitro 네이티브 모듈
├── targets/
│   └── widget/                   # iOS Widget & Live Activity Extension 타겟
├── plugins/                      # Expo Custom Config Plugins (Google Maps Key 등)
├── app.config.js                 # Expo 앱 설정 (권한, Privacy Manifest, 플러그인)
├── eas.json                      # EAS 빌드 & 배포 프로필 설정
└── package.json                  # 프로젝트 의존성 및 스크립트
```

---

## 🚀 개발 환경 세팅 & 실행 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
- **Node.js**: v18 이상 권장
- **npm** 또는 **yarn**
- **iOS**: macOS, Xcode, CocoaPods (iOS 시뮬레이터 또는 실기기 테스트용)
- **Android**: Android Studio & SDK (Android 에뮬레이터 또는 실기기 테스트용)

### 2. 의존성 패키지 설치
```bash
npm install
```

### 3. 개발 서버 실행
```bash
# Expo 개발 서버 시작
npm start

# iOS 시뮬레이터 실행 (Prebuild 포함)
npm run ios

# Android 에뮬레이터 실행 (Prebuild 포함)
npm run android

# 웹 브라우저 실행
npm run web
```

---

## 📦 빌드 및 배포 (Build & Deployment)

EAS(Expo Application Services)를 사용하여 iOS 및 Android 앱을 빌드 및 배포합니다.

### 1. 개발/프리뷰 빌드 (Internal Testing)
```bash
# Android APK 빌드
eas build --platform android --profile preview

# iOS 내부 테스트 빌드
eas build --platform ios --profile preview
```

### 2. 프로덕션 빌드 & 스토어 제출 (Production)
```bash
# 프로덕션 빌드 생성
eas build --platform all --profile production

# App Store 및 Google Play Console 제출
eas submit --platform ios
eas submit --platform android
```

> **참고 (iOS Privacy Manifest & Settings)**:  
> `app.config.js`에 App Store 제출을 위한 Privacy Manifest(`NSPrivacyCollectedDataTypes`, `NSPrivacyAccessedAPITypes`) 및 HealthKit 사용 권한 설명이 포함되어 있습니다.

---

## 📄 라이선스 (License)

본 프로젝트는 [LICENSE](LICENSE) 파일의 조건에 따릅니다.
