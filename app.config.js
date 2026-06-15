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
