module.exports = {
  expo: {
    name: '런마켓',
    slug: 'runmarket-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'runmarket',
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'cc.runmarket.app',
      appleTeamId: '2M4S6DRRVU',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: '러닝 중 현재 위치를 실시간으로 공유하기 위해 위치 권한이 필요합니다.',
        NSLocationAlwaysAndWhenInUseUsageDescription: '러닝 중 백그라운드에서도 위치를 공유하기 위해 위치 권한이 필요합니다.',
        ITSAppUsesNonExemptEncryption: false,
        NSSupportsLiveActivities: true,
        NSSupportsLiveActivitiesFrequentUpdates: true,
      },
      // App Store 제출용 Privacy Manifest (PrivacyInfo.xcprivacy 로 생성됨).
      // 웹(로그인 페이지)의 개인정보처리방침과 별개로, 바이너리에 포함돼야 심사를 통과한다.
      privacyManifests: {
        // 광고/크로스앱 추적을 하지 않음(IDFA 미사용).
        NSPrivacyTracking: false,
        // 앱이 수집하는 데이터 유형 신고. 모두 앱 기능 목적이며 추적에는 사용하지 않는다.
        NSPrivacyCollectedDataTypes: [
          {
            // 러닝 중 실시간 위치 공유 + 기록 저장
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePreciseLocation',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            ],
          },
          {
            // 로그인 계정 식별용 이메일
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            ],
          },
        ],
        // Required Reason API 신고 (RN/Expo 런타임이 공통으로 사용).
        NSPrivacyAccessedAPITypes: [
          {
            // UserDefaults: CA92.1 = 앱 자체 동작을 위한 접근
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
          {
            // 파일 타임스탬프: C617.1 = 앱 컨테이너 내부 파일 접근
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['C617.1'],
          },
          {
            // 시스템 부팅 시각: 35F9.1 = 앱 내 이벤트 시간 측정
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
            NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
          },
          {
            // 디스크 여유 공간: E174.1 = 쓰기 전 공간 확인
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['E174.1'],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
        backgroundColor: '#131A22',
      },
      package: 'cc.runmarket.app',
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      './plugins/withGoogleMapsApiKey.ts',
      '@bacons/apple-targets',
      [
        'expo-build-properties',
        {
          // 로컬 Xcode 툴체인(Swift)과 Expo 배포 prebuilt xcframework의 Swift 버전이
          // 달라 precompiled 모듈 링크가 실패하므로 RN/Expo 모듈을 소스에서 빌드한다.
          ios: {
            buildReactNativeFromSource: true,
          },
        },
      ],
      'expo-router',
      'expo-secure-store',
      'expo-sqlite',
      'react-native-maps',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 180,
          resizeMode: 'contain',
          backgroundColor: '#131A22',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: '러닝 중 화면이 꺼져 있어도 위치를 공유하기 위해 위치 권한이 필요합니다.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/android-icon-monochrome.png',
          color: '#FF8A00',
          sounds: [],
        },
      ],
      [
        // 크래시/에러 모니터링. EAS 빌드 시 SENTRY_AUTH_TOKEN 환경변수로 소스맵·디버그 심볼을
        // 자동 업로드한다(authToken은 비밀이므로 여기에 넣지 않고 eas env로 주입).
        '@sentry/react-native',
        {
          organization: 'runmarket',
          project: 'react-native',
        },
      ],
      [
        // 러닝 종료 후 iOS "건강/피트니스"에 달리기 운동을 저장한다.
        // HealthKit capability·권한(Info.plist)을 자동으로 설정한다.
        '@kingstinct/react-native-healthkit',
        {
          NSHealthUpdateUsageDescription:
            '완료한 러닝을 Apple 건강의 달리기 운동으로 저장하기 위해 접근 권한이 필요합니다.',
          NSHealthShareUsageDescription:
            '소모 칼로리를 추정하기 위해 체중 정보를 읽는 데 사용합니다.',
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: '1fabb4fc-cbc9-461f-a5e2-af2b52418c80',
      },
    },
    owner: 'feelsgoodfrog',
  },
};
