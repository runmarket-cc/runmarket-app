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
      infoPlist: {
        NSLocationWhenInUseUsageDescription: '러닝 중 현재 위치를 실시간으로 공유하기 위해 위치 권한이 필요합니다.',
        NSLocationAlwaysAndWhenInUseUsageDescription: '러닝 중 백그라운드에서도 위치를 공유하기 위해 위치 권한이 필요합니다.',
        ITSAppUsesNonExemptEncryption: false,
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
      './plugins/withLiveActivities.ts',
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
